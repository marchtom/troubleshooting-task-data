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

  it('holds ~25% error rate during the incident window', () => {
    expect(invariants.avgIncidentErrorRate).toBeGreaterThan(TARGET_ERROR_RATE - 0.03)
    expect(invariants.avgIncidentErrorRate).toBeLessThan(TARGET_ERROR_RATE + 0.03)
  })

  it('starts the incident at 16:00 UTC', () => {
    const incidentStart = new Date(scenario.incidentStart)
    expect(incidentStart.getUTCHours()).toBe(16)
    expect(incidentStart.getUTCMinutes()).toBe(0)
  })

  it('has seasonal volume with peak above off-peak', () => {
    expect(invariants.peakRequests).toBeGreaterThan(invariants.offPeakRequests * 1.5)
  })

  it('keeps LB-facing instance health and downstream deps healthy', () => {
    expect(invariants.allLbHealthy).toBe(true)
    expect(invariants.downstreamHealthy).toBe(true)
  })

  it('includes connection pool exhausted as dominant error aggregate', () => {
    const top = scenario.logAggregates[0]
    expect(top.key).toBe('pool')
    expect(top.pct).toBeGreaterThan(50)
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
