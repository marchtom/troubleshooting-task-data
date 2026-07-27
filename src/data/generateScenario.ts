import type {
  DependencyEdge,
  DependencyNode,
  Instance,
  LogAggregate,
  LogEntry,
  Scenario,
  TimePoint,
} from './types'

/** Fixed "now" — Wed 2026-07-15 16:30 UTC, with the incident beginning at 16:00 UTC. */
export const SCENARIO_NOW = Date.UTC(2026, 6, 15, 16, 30, 0)

export const SERVICE_NAME = 'sharing-service'
export const INSTANCE_COUNT = 45
export const AFFECTED_FRACTION = 0.6
/** Two container image SHAs currently live on prod: the rollout that stalled (new, erroring) and
 *  the previous image still running on the pods that were never updated. */
export const IMAGE_SHA_NEW = '7d3f9a2e'
export const IMAGE_SHA_OLD = 'b18c04a5'
export const TARGET_ERROR_RATE = 0.25
/** Errors visible for the last 30 minutes of the series. */
export const INCIDENT_LOOKBACK_MS = 30 * 60 * 1000
/** How quickly the error rate ramps once the incident begins. */
const RAMP_MS = 10 * 60 * 1000

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const ENDPOINTS_2XX = [
  '/2.0/files/{id}',
  '/2.0/folders/{id}/items',
  '/2.0/shared_items',
  '/2.0/collaborations',
  '/2.0/users/me',
  '/healthz',
]
const ENDPOINTS_3XX = ['/2.0/files/{id}/content', '/2.0/shared_items', '/2.0/authorize']

export interface EndpointDef {
  id: string
  label: string
  color: string
  weight: number
  errFactor: number
  isHealth?: boolean
}

/** Per-endpoint traffic split. Everything except /healthz touches the DB and shares the incident. */
export const ENDPOINT_DEFS: EndpointDef[] = [
  { id: 'files', label: 'GET /2.0/files/{id}', color: '#7aa2f7', weight: 0.34, errFactor: 1.05 },
  { id: 'folders', label: 'GET /2.0/folders/{id}/items', color: '#3ecf8e', weight: 0.28, errFactor: 0.98 },
  { id: 'shared', label: 'GET /2.0/shared_items', color: '#e6b84d', weight: 0.14, errFactor: 1.12 },
  { id: 'collabs', label: 'POST /2.0/collaborations', color: '#c3a6ff', weight: 0.14, errFactor: 0.9 },
  { id: 'health', label: 'GET /healthz', color: '#5cc8ff', weight: 0.1, errFactor: 0, isHealth: true },
]

/** Requests/s for one endpoint at a given point. Health probes are near-constant (no seasonality). */
export function endpointRequests(point: TimePoint, def: EndpointDef): number {
  if (def.isHealth) return Math.round(INSTANCE_COUNT * 0.9)
  return Math.round(point.requests * def.weight)
}

/** Error rate (%) for one endpoint. /healthz never touches the DB, so it stays healthy. */
export function endpointErrorPct(point: TimePoint, def: EndpointDef): number {
  if (def.isHealth) return 0
  const pct = point.errorRate * 100 * def.errFactor
  return Math.round(pct * 100) / 100
}

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

function smoothstep(x: number): number {
  const t = clamp(x, 0, 1)
  return t * t * (3 - 2 * t)
}

/** Autocorrelated wander in [-~amp, +~amp] so lines drift smoothly instead of jittering. */
function wanderArray(n: number, rng: () => number, amp: number, rho = 0.86): number[] {
  const out: number[] = []
  let v = 0
  const step = amp * Math.sqrt(1 - rho * rho) * 1.6
  for (let i = 0; i < n; i++) {
    v = rho * v + (rng() - 0.5) * 2 * step
    out.push(clamp(v, -amp * 1.8, amp * 1.8))
  }
  return out
}

/** Small moving-average pass to remove any residual sharpness. */
function smoothPass(values: number[], window = 2): number[] {
  const out: number[] = []
  for (let i = 0; i < values.length; i++) {
    let sum = 0
    let count = 0
    for (let j = i - window; j <= i + window; j++) {
      if (j >= 0 && j < values.length) {
        sum += values[j]
        count += 1
      }
    }
    out.push(sum / count)
  }
  return out
}

/** Seasonal traffic multiplier: daily US-hours peak, weekend dip, smoothly interpolated. */
export function seasonalMultiplier(ts: number): number {
  const d = new Date(ts)
  const day = d.getUTCDay()
  const hour = d.getUTCHours() + d.getUTCMinutes() / 60
  const weekend = day === 0 || day === 6
  const weekendFactor = weekend ? 0.6 : 1

  // Smooth diurnal curve peaking around 18:00 UTC (US business hours), quiet overnight.
  const radians = ((hour - 18) / 24) * 2 * Math.PI
  const diurnal = 0.72 + 0.32 * Math.cos(radians)

  return weekendFactor * diurnal
}

function labelFor(ts: number, range: TimeRangeInternal): string {
  const d = new Date(ts)
  const time = d.toLocaleString('en-US', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  if (range === '1h' || range === '6h') return time
  const dayLabel = d.toLocaleString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  })
  return `${dayLabel} ${time}`
}

type TimeRangeInternal = '1h' | '6h' | '24h' | '7d'

function buildSeries(now: number, rng: () => number): TimePoint[] {
  const start = now - 7 * 24 * HOUR
  const step = 5 * MINUTE
  const incidentStart = now - INCIDENT_LOOKBACK_MS
  const seasonNow = seasonalMultiplier(now)
  const baseRps = 430

  const times: number[] = []
  for (let t = start; t <= now; t += step) times.push(t)
  const n = times.length

  const reqWander = wanderArray(n, rng, 0.16, 0.78)
  const errWander = wanderArray(n, rng, 0.12)
  const p50Wander = wanderArray(n, rng, 0.09)
  const p90Wander = wanderArray(n, rng, 0.09)
  const p99Wander = wanderArray(n, rng, 0.11)
  const cpuWander = wanderArray(n, rng, 0.12)
  const memWander = wanderArray(n, rng, 0.06)
  const netWander = wanderArray(n, rng, 0.12)

  const requestsRaw: number[] = []
  const errorRateRaw: number[] = []
  const p50Raw: number[] = []
  const p90Raw: number[] = []
  const p99Raw: number[] = []
  const cpuRaw: number[] = []
  const memRaw: number[] = []
  const netRaw: number[] = []
  const dbLatRaw: number[] = []
  const dbConnRaw: number[] = []
  const diskRaw: number[] = []
  const healthyArr: number[] = []

  const affectedPods = Math.round(INSTANCE_COUNT * AFFECTED_FRACTION)
  const unaffectedPods = INSTANCE_COUNT - affectedPods
  const POOL_CAP = 7 // new config: pool_size 5 + max_overflow 2
  // The capped-config rollout landed ~6h before the report and stalled at ~60%. From that point
  // the affected pods hold at most POOL_CAP connections each, so the fleet total is bounded by a
  // ceiling (unaffected pods scale with demand, affected pods sit at the cap) and never reaches
  // the previous days' uncapped peak.
  const connOnset = now - 6 * HOUR
  const connWidth = 1 * HOUR

  for (let i = 0; i < n; i++) {
    const t = times[i]
    const season = seasonalMultiplier(t)
    // Short-term ripple so even a 1h window shows visible minute-to-minute movement (not a flat line).
    const ripple = 0.05 * Math.sin(i / 1.7) + 0.03 * Math.sin(i / 3.9 + 1.3)
    requestsRaw.push(baseRps * season * (1 + reqWander[i] + ripple))

    // Error rate: smooth ramp after onset, scaled by how heavy traffic is (pool pressure).
    const ramp = smoothstep((t - incidentStart) / RAMP_MS)

    // Healthy instances: ~full fleet pre-incident (occasional 1-pod wobble in wide windows);
    // during the incident the affected pods degrade, so the count ramps down toward the
    // unaffected count as the error signal grows.
    const preHealthy = INSTANCE_COUNT - (memWander[i] > 0.045 ? 1 : 0)
    healthyArr.push(Math.round(preHealthy - ramp * (preHealthy - unaffectedPods)))
    const loadFactor = clamp(season / seasonNow, 0.6, 1.15)
    const baseline = 0.0007
    const incidentRate = TARGET_ERROR_RATE * ramp * loadFactor * (1 + errWander[i] * 0.3)
    errorRateRaw.push(clamp(baseline + incidentRate, 0, 0.4))

    // Latency: gentle seasonal bump + connection-pool waits that grow with the ramp/load.
    const peak = 1 + Math.max(0, season - 0.9) * 0.12
    const poolWait = ramp * loadFactor
    p50Raw.push(46 * peak * (1 + p50Wander[i]) + poolWait * 26)
    p90Raw.push(120 * peak * (1 + p90Wander[i]) + poolWait * 320)
    p99Raw.push(260 * peak * (1 + p99Wander[i]) + poolWait * 1350)

    cpuRaw.push(30 + season * 12 + cpuWander[i] * 40)
    memRaw.push(52 + season * 5 + memWander[i] * 30)
    netRaw.push(20 + season * 12 + netWander[i] * 30)
    dbLatRaw.push(22 + season * 4 + p50Wander[i] * 12)

    // Active DB connections held by the fleet. Follows traffic seasonality (gentle amplitude);
    // as the capped-config rollout progresses, affected pods hold fewer connections, so today's
    // total diverges below — and stays under — the previous days' peak.
    const perPodDemand = (5 + season * 4.5) * (1 + reqWander[i] * 0.4)
    const excess = Math.max(0, perPodDemand - POOL_CAP)
    const connRamp = smoothstep((t - connOnset) / connWidth)
    const totalConn =
      unaffectedPods * perPodDemand + affectedPods * (perPodDemand - connRamp * excess)
    dbConnRaw.push(totalConn)

    diskRaw.push(5 + netWander[i] * 8)
  }

  const requests = smoothPass(requestsRaw)
  const errorRate = smoothPass(errorRateRaw)
  const p50 = smoothPass(p50Raw)
  const p90 = smoothPass(p90Raw)
  const p99 = smoothPass(p99Raw)
  const cpu = smoothPass(cpuRaw)
  const mem = smoothPass(memRaw)
  const net = smoothPass(netRaw)
  const dbLat = smoothPass(dbLatRaw)
  const dbConn = smoothPass(dbConnRaw)
  const disk = smoothPass(diskRaw)

  const points: TimePoint[] = []
  for (let i = 0; i < n; i++) {
    const req = Math.max(1, Math.round(requests[i]))
    const rate = errorRate[i]
    const server5xx = Math.round(req * rate)
    const client4xx = Math.round(req * (0.017 + p50Wander[i] * 0.003))
    const redirect3xx = Math.round(req * (0.012 + p90Wander[i] * 0.002))
    const ok2xx = Math.max(0, req - server5xx - client4xx - redirect3xx)

    points.push({
      t: times[i],
      label: labelFor(times[i], '1h'),
      requests: req,
      ok2xx,
      redirect3xx: Math.max(0, redirect3xx),
      client4xx: Math.max(0, client4xx),
      server5xx,
      errorRate: server5xx / Math.max(1, req),
      latencyP50: Math.round(p50[i]),
      latencyP90: Math.round(p90[i]),
      latencyP99: Math.round(p99[i]),
      cpuPct: Math.round(clamp(cpu[i], 12, 70) * 10) / 10,
      memoryPct: Math.round(clamp(mem[i], 35, 75) * 10) / 10,
      throttlePct: Math.round(clamp(0.4 + cpuWander[i] * 2, 0, 3) * 100) / 100,
      readyPods: INSTANCE_COUNT,
      desiredPods: INSTANCE_COUNT,
      healthyInstances: healthyArr[i],
      dbLatencyMs: Math.round(clamp(dbLat[i], 12, 45) * 10) / 10,
      dbActiveConnections: Math.max(0, Math.round(dbConn[i])),
      networkIoMBps: Math.round(clamp(net[i], 6, 55) * 10) / 10,
      diskIoMBps: Math.round(clamp(disk[i], 2, 14) * 10) / 10,
    })
  }

  return points
}

function buildInstances(rng: () => number): Instance[] {
  const affectedCount = Math.round(INSTANCE_COUNT * AFFECTED_FRACTION)
  const instances: Instance[] = []
  const replicaSet = '6c8f4d9b7d'

  for (let i = 0; i < INSTANCE_COUNT; i++) {
    const affected = i < affectedCount
    const id = `pod-${String(i + 1).padStart(2, '0')}`
    const suffix = Math.floor(rng() * 0x10000).toString(36).padStart(5, '0').slice(0, 5)
    instances.push({
      id,
      name: `${SERVICE_NAME}-${replicaSet}-${suffix}`,
      healthy: !affected,
      configVersion: affected ? 'vNew' : 'vPrev',
      imageSha: affected ? IMAGE_SHA_NEW : IMAGE_SHA_OLD,
      errorRate: affected ? 0.38 + rng() * 0.08 : 0.001 + rng() * 0.002,
      cpuPct: clamp(30 + rng() * 18, 20, 58),
      memoryPct: clamp(48 + rng() * 14, 38, 68),
    })
  }

  for (let i = instances.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[instances[i], instances[j]] = [instances[j], instances[i]]
  }

  return instances
}

const POOL_MESSAGE = 'error handling request: database session unavailable (connection checkout timed out)'
const POOL_WARN = 'db pool: no idle connections available — requests are queuing to check out a connection'
const POOL_STACK = [
  'Traceback (most recent call last):',
  '  File "/app/sharing_service/handlers/files.py", line 88, in get_file',
  '    with db.session() as session:',
  '  File "/app/sharing_service/db/pool.py", line 51, in acquire',
  '    conn = self._engine.connect()',
  '  File "/usr/local/lib/python3.11/site-packages/sqlalchemy/pool/base.py", line 1268, in connect',
  '    return _ConnectionFairy._checkout(self)',
  'sqlalchemy.exc.TimeoutError: connection pool exhausted; timed out waiting for a connection',
  '(Background on this error at: https://sqlalche.me/e/20/3o7r)',
].join('\n')

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

  // OpenTelemetry-style correlation ids. The service emits them into logs (early tracing
  // instrumentation), but no trace backend receives spans yet — the Traces tab stays empty.
  const hex = (len: number) => {
    let s = ''
    while (s.length < len) s += Math.floor(rng() * 0x100000000).toString(16).padStart(8, '0')
    return s.slice(0, len)
  }
  const otel = () => `trace_id=${hex(32)} span_id=${hex(16)}`

  for (let t = windowStart; t <= windowEnd; t += 220) {
    const inst = instances[Math.floor(rng() * instances.length)]
    const levelRoll = rng()
    const trace = otel()
    if (levelRoll < 0.48) {
      const path = ENDPOINTS_2XX[Math.floor(rng() * ENDPOINTS_2XX.length)]
      push({
        t,
        level: 'debug',
        instance: inst.name,
        message: `handled request method=GET path=${path} status=200 latency_ms=${Math.round(12 + rng() * 70)} ${trace}`,
        statusCode: 200,
      })
    } else if (levelRoll < 0.82) {
      const path = ENDPOINTS_2XX[Math.floor(rng() * ENDPOINTS_2XX.length)]
      push({
        t,
        level: 'info',
        instance: inst.name,
        message: `request completed status=200 path=${path} ${trace}`,
        statusCode: 200,
      })
    } else if (levelRoll < 0.93) {
      const path = ENDPOINTS_3XX[Math.floor(rng() * ENDPOINTS_3XX.length)]
      const code = rng() < 0.7 ? 302 : 301
      push({
        t,
        level: 'info',
        instance: inst.name,
        message: `request completed status=${code} path=${path} location=/2.0/files ${trace}`,
        statusCode: code,
      })
    } else if (levelRoll < 0.97) {
      push({
        t,
        level: 'warn',
        instance: inst.name,
        message: `slow downstream call target=cache-manager latency_ms=${Math.round(200 + rng() * 200)}`,
      })
    }
  }

  for (let i = 0; i < 900; i++) {
    const inst = instances[Math.floor(rng() * instances.length)]
    const isRedirect = rng() < 0.18
    const path = isRedirect
      ? ENDPOINTS_3XX[Math.floor(rng() * ENDPOINTS_3XX.length)]
      : ENDPOINTS_2XX[Math.floor(rng() * ENDPOINTS_2XX.length)]
    const code = isRedirect ? (rng() < 0.7 ? 302 : 301) : 200
    const trace = otel()
    push({
      t: windowStart + Math.floor(rng() * windowDuration),
      level: rng() < 0.35 ? 'debug' : 'info',
      instance: inst.name,
      message: isRedirect
        ? `request completed status=${code} path=${path} location=/2.0/files ${trace}`
        : `request completed status=${code} path=${path} ${trace}`,
      statusCode: code,
    })
  }

  for (let i = 0; i < 95; i++) {
    const codes = [400, 403, 423] as const
    const code = codes[Math.floor(rng() * codes.length)]
    const msgs: Record<number, string> = {
      400: 'bad request: invalid query parameter',
      403: 'forbidden: insufficient scope for shared link',
      423: 'locked: item is locked by another collaborator',
    }
    push({
      t: windowStart + Math.floor(rng() * windowDuration),
      level: 'error',
      instance: healthy[Math.floor(rng() * healthy.length)]?.name ?? instances[0].name,
      message: `${msgs[code]} ${otel()}`,
      statusCode: code,
    })
  }

  // Distractor: a poorly-configured synthetic E2E suite hammers the service with bad payloads.
  // Mostly 4xx (expired/invalid test fixtures, missing scopes), a few 5xx — noise unrelated to
  // the connection-pool incident.
  for (let i = 0; i < 120; i++) {
    const roll = rng()
    let code: number
    let message: string
    if (roll < 0.5) {
      code = 400
      message = 'bad request: invalid test payload field "shared_link.access"'
    } else if (roll < 0.82) {
      code = 422
      message = 'unprocessable entity: expired E2E fixture, item not found'
    } else if (roll < 0.94) {
      code = 401
      message = 'unauthorized: E2E service account token expired'
    } else {
      code = 502
      message = 'bad gateway: upstream test proxy reset connection'
    }
    push({
      t: windowStart + Math.floor(rng() * windowDuration),
      level: 'error',
      instance: healthy[Math.floor(rng() * healthy.length)]?.name ?? instances[0].name,
      message: `${message} client=e2e-test-runner user_agent=BoxE2E/1.0 ${otel()}`,
      statusCode: code,
    })
  }

  for (let i = 0; i < 70; i++) {
    const inst = affected[Math.floor(rng() * affected.length)]
    push({
      t: windowStart + Math.floor(rng() * windowDuration),
      level: 'error',
      instance: inst.name,
      message: `${POOL_MESSAGE} ${otel()}`,
      statusCode: 500,
      exception: 'sqlalchemy.exc.TimeoutError',
      stackTrace: POOL_STACK,
    })
  }

  // Breadcrumb WARNs on the affected pods: the symptom (no free connections) without naming the
  // config. Points toward the flat DB-connections ceiling for anyone who filters to warn.
  for (let i = 0; i < 40; i++) {
    const inst = affected[Math.floor(rng() * affected.length)]
    push({
      t: windowStart + Math.floor(rng() * windowDuration),
      level: 'warn',
      instance: inst.name,
      message: POOL_WARN,
    })
  }

  for (let i = 0; i < 3; i++) {
    push({
      t: windowStart + Math.floor(rng() * windowDuration),
      level: 'error',
      instance: instances[Math.floor(rng() * instances.length)].name,
      message: `service unavailable: request shed by load limiter ${otel()}`,
      statusCode: 503,
      exception: 'ServiceUnavailable',
    })
  }

  return logs.sort((a, b) => b.t - a.t)
}

/**
 * Classifies an error log entry into an aggregate bucket. Shared by the aggregate builder and the
 * Logs view so clicking a bucket filters the stream with exactly the same grouping logic.
 */
export function errorBucket(e: LogEntry): {
  key: string
  label: string
  kind: LogAggregate['kind']
} {
  if (e.exception === 'sqlalchemy.exc.TimeoutError') {
    // Left-panel aggregate label stays generic (matches the HTTP status the client sees); the raw
    // message + stack trace are only revealed in the stream row and the detail view.
    return {
      key: 'pool',
      label: '500 Internal Server Error',
      kind: 'pool',
    }
  }
  if (e.statusCode && e.statusCode >= 400 && e.statusCode < 500) {
    return { key: `4xx-${e.statusCode}`, label: `${e.statusCode} ${e.message.split(':')[0]}`, kind: '4xx' }
  }
  if (e.statusCode === 503) {
    return { key: '503', label: '503 service unavailable', kind: '5xx' }
  }
  if (e.statusCode && e.statusCode >= 500) {
    return { key: `5xx-${e.statusCode}`, label: `${e.statusCode} ${e.message.split(':')[0]}`, kind: '5xx' }
  }
  return { key: 'other', label: e.message.split(':')[0], kind: 'other' }
}

function buildLogAggregates(logs: LogEntry[]): LogAggregate[] {
  const errors = logs.filter((l) => l.level === 'error')
  const total = errors.length || 1
  const buckets = new Map<string, { label: string; count: number; kind: LogAggregate['kind'] }>()

  for (const e of errors) {
    const { key, label, kind } = errorBucket(e)
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

function buildDependencies(): { nodes: DependencyNode[]; edges: DependencyEdge[] } {
  const nodes: DependencyNode[] = [
    {
      id: 'api-gateway',
      name: 'api-gateway',
      role: 'upstream',
      requestCount: 18200,
      errorRate: 24.1,
      latencyP90: 420,
      health: 'Critical',
    },
    {
      id: 'web-app-bff',
      name: 'web-app-bff',
      role: 'upstream',
      requestCount: 9600,
      errorRate: 23.4,
      latencyP90: 390,
      health: 'Critical',
    },
    {
      id: 'open-api-router',
      name: 'open-api-router',
      role: 'upstream',
      requestCount: 4100,
      errorRate: 22.8,
      latencyP90: 450,
      health: 'Critical',
    },
    {
      id: 'e2e-test-runner',
      name: 'e2e-test-runner',
      role: 'upstream',
      requestCount: 1350,
      errorRate: 19.6,
      latencyP90: 180,
      health: 'Warning',
      note: 'Synthetic end-to-end test suite',
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
      name: 'sharing-db',
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
      id: 'auth',
      name: 'authentication',
      role: 'downstream',
      requestCount: 15100,
      errorRate: 0.03,
      latencyP90: 22,
      health: 'Ok',
    },
  ]

  const edges: DependencyEdge[] = [
    { from: 'api-gateway', to: 'self', requestCount: 18200, errorRate: 24.1, latencyP90: 420, health: 'Critical' },
    { from: 'web-app-bff', to: 'self', requestCount: 9600, errorRate: 23.4, latencyP90: 390, health: 'Critical' },
    { from: 'open-api-router', to: 'self', requestCount: 4100, errorRate: 22.8, latencyP90: 450, health: 'Critical' },
    { from: 'e2e-test-runner', to: 'self', requestCount: 1350, errorRate: 19.6, latencyP90: 180, health: 'Warning' },
    { from: 'self', to: 'db', requestCount: 18800, errorRate: 0.02, latencyP90: 18, health: 'Ok' },
    { from: 'self', to: 'vault', requestCount: 2200, errorRate: 0.01, latencyP90: 14, health: 'Ok' },
    { from: 'self', to: 'cache', requestCount: 27400, errorRate: 0.04, latencyP90: 9, health: 'Ok' },
    { from: 'self', to: 'auth', requestCount: 15100, errorRate: 0.03, latencyP90: 22, health: 'Ok' },
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
    nodes,
    edges,
  }
}

export function filterSeries(
  series: TimePoint[],
  now: number,
  range: TimeRange,
): TimePoint[] {
  const ms =
    range === '1h' ? HOUR : range === '6h' ? 6 * HOUR : range === '24h' ? 24 * HOUR : 7 * 24 * HOUR
  const start = now - ms
  let filtered = series.filter((p) => p.t >= start)
  if (range === '7d') filtered = filtered.filter((_, i) => i % 6 === 0)
  else if (range === '24h') filtered = filtered.filter((_, i) => i % 2 === 0)
  // Relabel per range so every X value is unique (fixes tooltip hover on wide ranges).
  return filtered.map((p) => ({ ...p, label: labelFor(p.t, range) }))
}

type TimeRange = TimeRangeInternal

export function scenarioInvariants(scenario: Scenario) {
  const affected = scenario.instances.filter((i) => !i.healthy).length
  const recent = scenario.series.filter((p) => p.t >= scenario.incidentStart)
  const last = scenario.series[scenario.series.length - 1]
  const preIncident = scenario.series.filter((p) => p.t < scenario.incidentStart)
  const avgPre =
    preIncident.reduce((sum, p) => sum + p.errorRate, 0) / Math.max(1, preIncident.length)
  const avgError =
    recent.reduce((sum, p) => sum + p.errorRate, 0) / Math.max(1, recent.length)
  const peakHour = scenario.series.reduce((best, p) => (p.requests > best.requests ? p : best))
  const offPeak = scenario.series.reduce((best, p) => (p.requests < best.requests ? p : best))

  return {
    affectedCount: affected,
    affectedFraction: affected / scenario.instances.length,
    avgIncidentErrorRate: avgError,
    lastErrorRate: last.errorRate,
    preIncidentErrorRate: avgPre,
    peakRequests: peakHour.requests,
    offPeakRequests: offPeak.requests,
    downstreamHealthy: scenario.nodes
      .filter((n) => n.role === 'downstream')
      .every((n) => n.health === 'Ok'),
  }
}
