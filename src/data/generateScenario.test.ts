import { describe, expect, it } from 'vitest'
import {
  AFFECTED_FRACTION,
  TARGET_ERROR_RATE,
  generateScenario,
  seasonalMultiplier,
  scenarioInvariants,
} from './generateScenario'

describe('generateScenario', () => {
  const scenario = generateScenario(42)
  const invariants = scenarioInvariants(scenario)

  it('keeps ~60% of instances affected', () => {
    expect(invariants.affectedFraction).toBeCloseTo(AFFECTED_FRACTION, 1)
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

  it('extends logs five minutes on both sides of the original window', () => {
    const times = scenario.logs.map((log) => log.t)
    expect(Math.min(...times)).toBe(scenario.now - 20 * 60_000)
    expect(Math.max(...times)).toBeGreaterThan(scenario.now)
    expect(Math.max(...times)).toBeLessThanOrEqual(scenario.now + 5 * 60_000)
  })

  it('models daily seasonality multipliers', () => {
    const night = seasonalMultiplier(Date.UTC(2026, 6, 15, 3, 0, 0))
    const usPeak = seasonalMultiplier(Date.UTC(2026, 6, 15, 18, 0, 0))
    const weekendPeak = seasonalMultiplier(Date.UTC(2026, 6, 18, 18, 0, 0))
    expect(usPeak).toBeGreaterThan(night)
    expect(usPeak).toBeGreaterThan(weekendPeak)
  })
})
