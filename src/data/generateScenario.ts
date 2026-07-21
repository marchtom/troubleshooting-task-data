import type {
  DependencyEdge,
  DependencyNode,
  Instance,
  LogAggregate,
  LogEntry,
  Scenario,
  TimePoint,
  TraceSummary,
} from './types'

/** Fixed "now" — Wed 2026-07-15 16:30 UTC, with the incident beginning at 16:00 UTC. */
export const SCENARIO_NOW = Date.UTC(2026, 6, 15, 16, 30, 0)

export const SERVICE_NAME = 'checkout-api'
export const INSTANCE_COUNT = 45
export const AFFECTED_FRACTION = 0.6
export const TARGET_ERROR_RATE = 0.25
/** Errors visible for the last 30 minutes of the series. */
export const INCIDENT_LOOKBACK_MS = 30 * 60 * 1000

const MINUTE = 60_000
const HOUR = 60 * MINUTE

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Seasonal traffic multiplier: daily US-hours peak, weekend dip. */
export function seasonalMultiplier(ts: number): number {
  const d = new Date(ts)
  const day = d.getUTCDay() // 0 Sun … 6 Sat
  const hour = d.getUTCHours()
  const weekend = day === 0 || day === 6
  const weekendFactor = weekend ? 0.55 : 1

  // UTC hours approximating EMEA morning quiet → US business peak
  let hourFactor: number
  if (hour >= 0 && hour < 6) hourFactor = 0.35
  else if (hour >= 6 && hour < 12) hourFactor = 0.55
  else if (hour >= 12 && hour < 15) hourFactor = 0.85
  else if (hour >= 15 && hour < 22) hourFactor = 1.15
  else hourFactor = 0.7

  return weekendFactor * hourFactor
}

function formatLabel(ts: number, stepMs: number): string {
  const d = new Date(ts)
  if (stepMs >= HOUR) {
    return d.toLocaleString('en-US', {
      timeZone: 'UTC',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }
  return d.toLocaleString('en-US', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function buildSeries(now: number, rng: () => number): TimePoint[] {
  const start = now - 7 * 24 * HOUR
  const step = 5 * MINUTE
  const points: TimePoint[] = []
  const incidentStart = now - INCIDENT_LOOKBACK_MS
  const baseRps = 420

  for (let t = start; t <= now; t += step) {
    const season = seasonalMultiplier(t)
    const noise = 0.92 + rng() * 0.16
    const requests = Math.round(baseRps * season * noise)

    const inIncident = t >= incidentStart
    const errorRate = inIncident ? TARGET_ERROR_RATE : 0.0008 + rng() * 0.0004
    const server5xx = Math.round(requests * errorRate)
    const client4xx = Math.round(requests * (0.018 + rng() * 0.004) * season * 0.85)
    const redirect3xx = Math.round(requests * (0.012 + rng() * 0.003))
    const used = server5xx + client4xx + redirect3xx
    const ok2xx = Math.max(0, requests - used)

    const latencyBump = inIncident ? 1.35 : 1
    const peakBump = season > 1 ? 1.08 : 1

    points.push({
      t,
      label: formatLabel(t, step),
      requests,
      ok2xx,
      redirect3xx,
      client4xx,
      server5xx,
      errorRate: server5xx / Math.max(1, requests),
      latencyP50: Math.round(42 * peakBump * latencyBump * (0.95 + rng() * 0.1)),
      latencyP90: Math.round(110 * peakBump * latencyBump * (0.95 + rng() * 0.12)),
      latencyP99: Math.round(240 * peakBump * (inIncident ? 1.7 : 1) * (0.95 + rng() * 0.15)),
      cpuPct: clamp(28 + season * 12 + rng() * 6, 15, 62),
      memoryPct: clamp(46 + season * 6 + rng() * 4, 35, 68),
      throttlePct: clamp(0.2 + rng() * 0.8, 0, 2.5),
      restarts: 0,
      readyPods: INSTANCE_COUNT,
      desiredPods: INSTANCE_COUNT,
      dbLatencyMs: clamp(8 + rng() * 4 + season * 2, 6, 22),
      dbReplicationLagMs: clamp(rng() * 12, 0, 40),
      networkIoMBps: clamp(18 + season * 10 + rng() * 4, 8, 45),
      diskIoMBps: clamp(4 + rng() * 2, 2, 12),
      istioCpuPct: clamp(12 + season * 4 + rng() * 3, 6, 28),
      istioMemoryPct: clamp(22 + rng() * 4, 16, 35),
    })
  }

  return points
}

function buildInstances(rng: () => number): Instance[] {
  const affectedCount = Math.round(INSTANCE_COUNT * AFFECTED_FRACTION)
  const instances: Instance[] = []

  for (let i = 0; i < INSTANCE_COUNT; i++) {
    const affected = i < affectedCount
    const id = `pod-${String(i + 1).padStart(2, '0')}`
    instances.push({
      id,
      name: `${SERVICE_NAME}-${id}-7f${(10 + i).toString(16)}`,
      healthy: !affected,
      lbStatus: 'healthy',
      configVersion: affected ? 'vNew' : 'vPrev',
      errorRate: affected ? 0.38 + rng() * 0.08 : 0.001 + rng() * 0.002,
      cpuPct: clamp(30 + rng() * 18, 20, 58),
      memoryPct: clamp(44 + rng() * 14, 35, 65),
      restarts: 0,
      ready: true,
    })
  }

  // Shuffle deterministically so affected pods aren't a contiguous block in the UI
  for (let i = instances.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[instances[i], instances[j]] = [instances[j], instances[i]]
  }

  return instances
}

function buildLogs(now: number, instances: Instance[], rng: () => number): LogEntry[] {
  const logs: LogEntry[] = []
  const windowStart = now - 20 * MINUTE
  const windowEnd = now + 5 * MINUTE
  const windowDuration = windowEnd - windowStart
  const affected = instances.filter((i) => !i.healthy)
  const healthy = instances.filter((i) => i.healthy)
  let id = 0

  const push = (entry: Omit<LogEntry, 'id'>) => {
    logs.push({ ...entry, id: `log-${++id}` })
  }

  // Dense success traffic — hard to scan without filtering; drowns incident signal in the raw stream
  const paths2xx = [
    '/api/v1/cart',
    '/api/v1/orders',
    '/api/v1/orders/{id}',
    '/api/v1/checkout/preview',
    '/api/v1/inventory',
    '/healthz',
  ]
  const paths3xx = [
    '/api/v1/checkout',
    '/api/v1/legacy/cart',
    '/api/v1/session/renew',
  ]

  for (let t = windowStart; t <= windowEnd; t += 220) {
    const inst = instances[Math.floor(rng() * instances.length)]
    const levelRoll = rng()
    const reqId = Math.floor(rng() * 1e8)
    if (levelRoll < 0.48) {
      const path = paths2xx[Math.floor(rng() * paths2xx.length)]
      push({
        t,
        level: 'debug',
        instance: inst.name,
        message: `handled request method=GET path=${path} status=200 latency_ms=${Math.round(12 + rng() * 70)} request_id=req_${reqId}`,
        statusCode: 200,
      })
    } else if (levelRoll < 0.82) {
      const path = paths2xx[Math.floor(rng() * paths2xx.length)]
      push({
        t,
        level: 'info',
        instance: inst.name,
        message: `request completed status=200 path=${path} request_id=req_${reqId}`,
        statusCode: 200,
      })
    } else if (levelRoll < 0.93) {
      const path = paths3xx[Math.floor(rng() * paths3xx.length)]
      const code = rng() < 0.7 ? 302 : 301
      push({
        t,
        level: 'info',
        instance: inst.name,
        message: `request completed status=${code} path=${path} location=/api/v1/cart request_id=req_${reqId}`,
        statusCode: code,
      })
    } else if (levelRoll < 0.97) {
      push({
        t,
        level: 'warn',
        instance: inst.name,
        message: `slow request path=/api/v1/checkout latency_ms=${Math.round(200 + rng() * 200)} status=200`,
        statusCode: 200,
      })
    }
  }

  // Extra burst of successful 2xx/3xx so the stream stays noisy even when scrolling recent lines
  for (let i = 0; i < 900; i++) {
    const inst = instances[Math.floor(rng() * instances.length)]
    const isRedirect = rng() < 0.18
    const path = isRedirect
      ? paths3xx[Math.floor(rng() * paths3xx.length)]
      : paths2xx[Math.floor(rng() * paths2xx.length)]
    const code = isRedirect ? (rng() < 0.7 ? 302 : 301) : 200
    push({
      t: windowStart + Math.floor(rng() * windowDuration),
      level: rng() < 0.35 ? 'debug' : 'info',
      instance: inst.name,
      message: isRedirect
        ? `request completed status=${code} path=${path} location=/api/v1/cart request_id=req_${Math.floor(rng() * 1e8)}`
        : `request completed status=${code} path=${path} request_id=req_${Math.floor(rng() * 1e8)}`,
      statusCode: code,
    })
  }

  // Baseline 4xx noise — enough to dilute pool signal among errors
  for (let i = 0; i < 95; i++) {
    const codes = [400, 403, 423] as const
    const code = codes[Math.floor(rng() * codes.length)]
    const msgs: Record<number, string> = {
      400: 'bad request: invalid payload schema',
      403: 'forbidden: missing entitlement',
      423: 'locked: resource version conflict',
    }
    push({
      t: windowStart + Math.floor(rng() * windowDuration),
      level: 'error',
      instance: healthy[Math.floor(rng() * healthy.length)]?.name ?? instances[0].name,
      message: msgs[code],
      statusCode: code,
    })
  }

  // Incident signal on affected instances — still dominant among errors, not in the raw stream
  for (let i = 0; i < 130; i++) {
    const inst = affected[Math.floor(rng() * affected.length)]
    push({
      t: windowStart + Math.floor(rng() * windowDuration),
      level: 'error',
      instance: inst.name,
      message: 'connection pool exhausted — max connections reached',
      statusCode: 500,
      exception: 'PoolExhaustedException',
      stackTrace: [
        'PoolExhaustedException: connection pool exhausted — max connections reached',
        `  at DbPool.acquire (db/pool.ts:142)`,
        `  at OrderRepository.findById (orders/repo.ts:88)`,
        `  at CheckoutHandler.handle (checkout/handler.ts:54)`,
        `  at HttpServer.dispatch (${SERVICE_NAME}/server.ts:210)`,
      ].join('\n'),
    })
  }

  // Rare 503 noise
  for (let i = 0; i < 3; i++) {
    push({
      t: windowStart + Math.floor(rng() * windowDuration),
      level: 'error',
      instance: instances[Math.floor(rng() * instances.length)].name,
      message: 'service unavailable: upstream timeout',
      statusCode: 503,
      exception: 'UpstreamTimeout',
    })
  }

  return logs.sort((a, b) => b.t - a.t)
}

function buildLogAggregates(logs: LogEntry[]): LogAggregate[] {
  const errors = logs.filter((l) => l.level === 'error')
  const total = errors.length || 1
  const buckets = new Map<string, { label: string; count: number; kind: LogAggregate['kind'] }>()

  for (const e of errors) {
    let key: string
    let label: string
    let kind: LogAggregate['kind']
    if (e.message.includes('connection pool exhausted')) {
      key = 'pool'
      label = 'connection pool exhausted'
      kind = 'pool'
    } else if (e.statusCode && e.statusCode >= 400 && e.statusCode < 500) {
      key = `4xx-${e.statusCode}`
      label = `${e.statusCode} ${e.message.split(':')[0]}`
      kind = '4xx'
    } else if (e.statusCode === 503) {
      key = '503'
      label = '503 service unavailable'
      kind = '5xx'
    } else {
      key = 'other-5xx'
      label = '500 internal server error'
      kind = '5xx'
    }
    const prev = buckets.get(key) ?? { label, count: 0, kind }
    prev.count += 1
    buckets.set(key, prev)
  }

  return [...buckets.entries()]
    .map(([key, v]) => ({
      key,
      label: v.label,
      count: v.count,
      pct: (v.count / total) * 100,
      kind: v.kind,
    }))
    .sort((a, b) => b.count - a.count)
}

function buildTraces(now: number): TraceSummary[] {
  return [
    {
      id: 'tr-ok-1',
      t: now - 2 * MINUTE,
      endpoint: 'POST /api/v1/checkout',
      status: 'ok',
      durationMs: 118,
      statusCode: 200,
      rootCause: 'Completed successfully',
      spans: [
        {
          id: 's1',
          service: SERVICE_NAME,
          operation: 'HTTP POST /api/v1/checkout',
          startMs: 0,
          durationMs: 118,
          status: 'ok',
        },
        {
          id: 's2',
          service: SERVICE_NAME,
          operation: 'DbPool.acquire',
          startMs: 8,
          durationMs: 4,
          status: 'ok',
        },
        {
          id: 's3',
          service: 'orders-db',
          operation: 'SELECT orders',
          startMs: 14,
          durationMs: 22,
          status: 'ok',
        },
        {
          id: 's4',
          service: 'cache-manager',
          operation: 'GET cart',
          startMs: 40,
          durationMs: 6,
          status: 'ok',
        },
        {
          id: 's5',
          service: 'identity-provider',
          operation: 'ValidateToken',
          startMs: 48,
          durationMs: 18,
          status: 'ok',
        },
      ],
    },
    {
      id: 'tr-err-1',
      t: now - MINUTE,
      endpoint: 'POST /api/v1/checkout',
      status: 'error',
      durationMs: 310,
      statusCode: 500,
      rootCause: 'Blocked in checkout-api acquiring DB connection — never reached orders-db',
      spans: [
        {
          id: 'e1',
          service: SERVICE_NAME,
          operation: 'HTTP POST /api/v1/checkout',
          startMs: 0,
          durationMs: 310,
          status: 'error',
          detail: '500 PoolExhaustedException',
        },
        {
          id: 'e2',
          service: SERVICE_NAME,
          operation: 'DbPool.acquire',
          startMs: 12,
          durationMs: 298,
          status: 'error',
          detail: 'connection pool exhausted — max connections reached',
        },
      ],
    },
    {
      id: 'tr-err-2',
      t: now - 4 * MINUTE,
      endpoint: 'GET /api/v1/orders/{id}',
      status: 'error',
      durationMs: 285,
      statusCode: 500,
      rootCause: 'Failure local to checkout-api connection pool',
      spans: [
        {
          id: 'e3',
          service: SERVICE_NAME,
          operation: 'HTTP GET /api/v1/orders/{id}',
          startMs: 0,
          durationMs: 285,
          status: 'error',
        },
        {
          id: 'e4',
          service: SERVICE_NAME,
          operation: 'DbPool.acquire',
          startMs: 6,
          durationMs: 279,
          status: 'error',
          detail: 'connection pool exhausted — max connections reached',
        },
      ],
    },
    {
      id: 'tr-ok-2',
      t: now - 5 * MINUTE,
      endpoint: 'GET /api/v1/cart',
      status: 'ok',
      durationMs: 64,
      statusCode: 200,
      rootCause: 'Completed successfully',
      spans: [
        {
          id: 's6',
          service: SERVICE_NAME,
          operation: 'HTTP GET /api/v1/cart',
          startMs: 0,
          durationMs: 64,
          status: 'ok',
        },
        {
          id: 's7',
          service: 'cache-manager',
          operation: 'GET cart',
          startMs: 5,
          durationMs: 8,
          status: 'ok',
        },
        {
          id: 's8',
          service: 'vault',
          operation: 'ReadSecret',
          startMs: 16,
          durationMs: 12,
          status: 'ok',
        },
      ],
    },
  ]
}

function buildDependencies(): { nodes: DependencyNode[]; edges: DependencyEdge[] } {
  const nodes: DependencyNode[] = [
    {
      id: 'storefront',
      name: 'storefront-web',
      role: 'upstream',
      requestCount: 18200,
      errorRate: 24.1,
      latencyP90: 420,
      health: 'Critical',
      note: 'Caller seeing elevated errors (symptom)',
    },
    {
      id: 'mobile',
      name: 'mobile-bff',
      role: 'upstream',
      requestCount: 9600,
      errorRate: 23.4,
      latencyP90: 390,
      health: 'Critical',
      note: 'Caller seeing elevated errors (symptom)',
    },
    {
      id: 'partner',
      name: 'partner-gateway',
      role: 'upstream',
      requestCount: 4100,
      errorRate: 22.8,
      latencyP90: 450,
      health: 'Critical',
      note: 'Errors independent of recent caller deploys',
    },
    {
      id: 'self',
      name: SERVICE_NAME,
      role: 'self',
      requestCount: 32100,
      errorRate: 25.0,
      latencyP90: 310,
      health: 'Critical',
    },
    {
      id: 'db',
      name: 'orders-db',
      role: 'downstream',
      requestCount: 18800,
      errorRate: 0.02,
      latencyP90: 18,
      health: 'Ok',
      note: 'Owned by another team — limited insight',
    },
    {
      id: 'vault',
      name: 'vault',
      role: 'downstream',
      requestCount: 2200,
      errorRate: 0.01,
      latencyP90: 14,
      health: 'Ok',
    },
    {
      id: 'cache',
      name: 'cache-manager',
      role: 'downstream',
      requestCount: 27400,
      errorRate: 0.04,
      latencyP90: 9,
      health: 'Ok',
    },
    {
      id: 'idp',
      name: 'identity-provider',
      role: 'downstream',
      requestCount: 15100,
      errorRate: 0.03,
      latencyP90: 22,
      health: 'Ok',
    },
  ]

  const edges: DependencyEdge[] = [
    { from: 'storefront', to: 'self', requestCount: 18200, errorRate: 24.1, latencyP90: 420, health: 'Critical' },
    { from: 'mobile', to: 'self', requestCount: 9600, errorRate: 23.4, latencyP90: 390, health: 'Critical' },
    { from: 'partner', to: 'self', requestCount: 4100, errorRate: 22.8, latencyP90: 450, health: 'Critical' },
    { from: 'self', to: 'db', requestCount: 18800, errorRate: 0.02, latencyP90: 18, health: 'Ok' },
    { from: 'self', to: 'vault', requestCount: 2200, errorRate: 0.01, latencyP90: 14, health: 'Ok' },
    { from: 'self', to: 'cache', requestCount: 27400, errorRate: 0.04, latencyP90: 9, health: 'Ok' },
    { from: 'self', to: 'idp', requestCount: 15100, errorRate: 0.03, latencyP90: 22, health: 'Ok' },
  ]

  return { nodes, edges }
}

export function generateScenario(seed = 42): Scenario {
  const rng = mulberry32(seed)
  const now = SCENARIO_NOW
  const instances = buildInstances(rng)
  const series = buildSeries(now, rng)
  const logs = buildLogs(now, instances, rng)
  const { nodes, edges } = buildDependencies()

  return {
    now,
    serviceName: SERVICE_NAME,
    instanceCount: INSTANCE_COUNT,
    affectedFraction: AFFECTED_FRACTION,
    targetErrorRate: TARGET_ERROR_RATE,
    incidentStart: now - INCIDENT_LOOKBACK_MS,
    instances,
    series,
    logs,
    logAggregates: buildLogAggregates(logs),
    traces: buildTraces(now),
    nodes,
    edges,
  }
}

export function filterSeries(series: TimePoint[], now: number, range: '1h' | '6h' | '24h' | '7d'): TimePoint[] {
  const ms =
    range === '1h' ? HOUR : range === '6h' ? 6 * HOUR : range === '24h' ? 24 * HOUR : 7 * 24 * HOUR
  const start = now - ms
  const filtered = series.filter((p) => p.t >= start)
  // Downsample longer ranges for chart readability
  if (range === '7d') return filtered.filter((_, i) => i % 6 === 0)
  if (range === '24h') return filtered.filter((_, i) => i % 2 === 0)
  return filtered
}

export function scenarioInvariants(scenario: Scenario) {
  const affected = scenario.instances.filter((i) => !i.healthy).length
  const recent = scenario.series.filter((p) => p.t >= scenario.incidentStart)
  const avgError =
    recent.reduce((sum, p) => sum + p.errorRate, 0) / Math.max(1, recent.length)
  const peakHour = scenario.series.reduce((best, p) => (p.requests > best.requests ? p : best))
  const offPeak = scenario.series.reduce((best, p) => (p.requests < best.requests ? p : best))

  return {
    affectedCount: affected,
    affectedFraction: affected / scenario.instances.length,
    avgIncidentErrorRate: avgError,
    peakRequests: peakHour.requests,
    offPeakRequests: offPeak.requests,
    allLbHealthy: scenario.instances.every((i) => i.lbStatus === 'healthy' && i.ready),
    downstreamHealthy: scenario.nodes
      .filter((n) => n.role === 'downstream')
      .every((n) => n.health === 'Ok'),
  }
}
