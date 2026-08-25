import { describe, expect, it } from 'vitest'
import {
  AFFECTED_FRACTION,
  IMAGE_SHA_NEW,
  TARGET_ERROR_RATE,
  generateScenario,
  seasonalMultiplier,
  scenarioInvariants,
} from './generateScenario'
import { INCIDENT_COMMIT_SHA } from './scenarioConstants'

describe('generateScenario', () => {
  const scenario = generateScenario(42)
  const invariants = scenarioInvariants(scenario)

  it('keeps ~60% of instances affected', () => {
    expect(invariants.affectedFraction).toBeCloseTo(AFFECTED_FRACTION, 1)
  })

  it('tags affected instances with the incident changelog commit', () => {
    const affected = scenario.instances.filter((instance) => !instance.healthy)
    expect(IMAGE_SHA_NEW).toBe(INCIDENT_COMMIT_SHA)
    expect(affected.every((instance) => instance.imageSha === INCIDENT_COMMIT_SHA)).toBe(true)
  })

  it('ramps toward ~25% error rate by the end of the incident window', () => {
    expect(invariants.preIncidentErrorRate).toBeLessThan(0.01)
    expect(invariants.avgIncidentErrorRate).toBeGreaterThan(0.15)
    expect(invariants.lastErrorRate).toBeGreaterThan(TARGET_ERROR_RATE - 0.06)
    expect(invariants.lastErrorRate).toBeLessThan(TARGET_ERROR_RATE + 0.06)
  })

  it('ramps the error rate smoothly rather than as a hard step', () => {
    const inc = scenario.series.filter((p) => p.t >= scenario.incidentStart)
    const maxJump = inc
      .slice(1)
      .reduce((m, p, i) => Math.max(m, Math.abs(p.errorRate - inc[i].errorRate)), 0)
    // No single 5-minute bucket should jump by more than ~8 percentage points.
    expect(maxJump).toBeLessThan(0.08)
  })

  it('starts the incident at 16:00 UTC', () => {
    const incidentStart = new Date(scenario.incidentStart)
    expect(incidentStart.getUTCHours()).toBe(16)
    expect(incidentStart.getUTCMinutes()).toBe(0)
  })

  it('has seasonal volume with peak above off-peak', () => {
    expect(invariants.peakRequests).toBeGreaterThan(invariants.offPeakRequests * 1.5)
  })

  it('keeps downstream deps healthy', () => {
    expect(invariants.downstreamHealthy).toBe(true)
  })

  it('surfaces the connection-pool timeout as a visible (non-dominant) error bucket', () => {
    const pool = scenario.logAggregates.find((a) => a.key === 'pool')
    // No longer the single largest bucket (E2E 4xx noise is comparable), but still clearly present
    // with a label that hints at the DB connection root cause.
    expect(pool).toBeDefined()
    expect(pool!.count).toBeGreaterThan(0)
    // Aggregate label is the generic HTTP status; the DB root-cause wording lives only in the
    // stream row + detail view, not the left panel.
    expect(pool!.label).toBe('500 Internal Server Error')
  })

  it('shows a full healthy fleet pre-incident that degrades toward the unaffected count', () => {
    const fleet = scenario.instanceCount
    const unaffected = Math.round(fleet * (1 - AFFECTED_FRACTION))
    const pre = scenario.series.filter((p) => p.t < scenario.incidentStart)
    const last = scenario.series[scenario.series.length - 1]
    for (const p of pre) {
      expect(p.healthyInstances).toBeGreaterThanOrEqual(fleet - 1)
      expect(p.healthyInstances).toBeLessThanOrEqual(fleet)
    }
    expect(last.healthyInstances).toBeCloseTo(unaffected, 0)
  })

  it('includes logs from 15:30 UTC through five minutes after now', () => {
    const times = scenario.logs.map((log) => log.t)
    expect(Math.min(...times)).toBe(Date.UTC(2026, 6, 15, 15, 30, 0))
    expect(Math.max(...times)).toBeGreaterThan(scenario.now)
    expect(Math.max(...times)).toBeLessThanOrEqual(scenario.now + 5 * 60_000)
  })

  it('emits connection-pool failures only after the rollout', () => {
    const pool = scenario.logs.filter((log) => log.exception === 'sqlalchemy.exc.TimeoutError')
    const poolWarns = scenario.logs.filter((log) => log.message.startsWith('db pool:'))

    expect(pool.length).toBeGreaterThan(0)
    expect(poolWarns.length).toBeGreaterThan(0)
    expect(pool.every((log) => log.t >= scenario.incidentStart)).toBe(true)
    expect(poolWarns.every((log) => log.t >= scenario.incidentStart)).toBe(true)
  })

  it('keeps non-pool errors at a steady level across the whole window', () => {
    const others = scenario.logs.filter(
      (log) => log.level === 'error' && log.exception !== 'sqlalchemy.exc.TimeoutError',
    )
    const before = others.filter((log) => log.t < scenario.incidentStart)
    const after = others.filter((log) => log.t >= scenario.incidentStart)
    const windowStart = Math.min(...scenario.logs.map((log) => log.t))
    const windowEnd = Math.max(...scenario.logs.map((log) => log.t))

    const beforeRate = before.length / (scenario.incidentStart - windowStart)
    const afterRate = after.length / (windowEnd - scenario.incidentStart)

    expect(before.length).toBeGreaterThan(0)
    expect(afterRate / beforeRate).toBeGreaterThan(0.7)
    expect(afterRate / beforeRate).toBeLessThan(1.4)
  })

  it('models daily seasonality multipliers', () => {
    const night = seasonalMultiplier(Date.UTC(2026, 6, 15, 3, 0, 0))
    const usPeak = seasonalMultiplier(Date.UTC(2026, 6, 15, 18, 0, 0))
    const weekendPeak = seasonalMultiplier(Date.UTC(2026, 6, 18, 18, 0, 0))
    expect(usPeak).toBeGreaterThan(night)
    expect(usPeak).toBeGreaterThan(weekendPeak)
  })
})
