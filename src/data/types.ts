export type ViewId = 'home' | 'requests' | 'instances' | 'logs' | 'traces' | 'dependencies'

export type TimeRange = '1h' | '6h' | '24h' | '7d'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface TimePoint {
  t: number
  label: string
  requests: number
  ok2xx: number
  redirect3xx: number
  client4xx: number
  server5xx: number
  errorRate: number
  latencyP50: number
  latencyP90: number
  latencyP99: number
  cpuPct: number
  memoryPct: number
  throttlePct: number
  restarts: number
  readyPods: number
  desiredPods: number
  dbLatencyMs: number
  dbReplicationLagMs: number
  networkIoMBps: number
  diskIoMBps: number
  istioCpuPct: number
  istioMemoryPct: number
}

export interface Instance {
  id: string
  name: string
  healthy: boolean
  lbStatus: 'healthy' | 'unhealthy'
  configVersion: 'vPrev' | 'vNew'
  errorRate: number
  cpuPct: number
  memoryPct: number
  restarts: number
  ready: boolean
}

export interface LogEntry {
  id: string
  t: number
  level: LogLevel
  instance: string
  message: string
  statusCode?: number
  exception?: string
  stackTrace?: string
}

export interface LogAggregate {
  key: string
  label: string
  count: number
  pct: number
  kind: '4xx' | '5xx' | 'pool' | 'other'
}

export interface TraceSpan {
  id: string
  service: string
  operation: string
  startMs: number
  durationMs: number
  status: 'ok' | 'error'
  detail?: string
}

export interface TraceSummary {
  id: string
  t: number
  endpoint: string
  status: 'ok' | 'error'
  durationMs: number
  statusCode: number
  rootCause: string
  spans: TraceSpan[]
}

export interface DependencyNode {
  id: string
  name: string
  role: 'upstream' | 'self' | 'downstream'
  requestCount: number
  errorRate: number
  latencyP90: number
  health: 'Ok' | 'Warning' | 'Critical'
  note?: string
}

export interface DependencyEdge {
  from: string
  to: string
  requestCount: number
  errorRate: number
  latencyP90: number
  health: 'Ok' | 'Warning' | 'Critical'
}

export interface Scenario {
  now: number
  serviceName: string
  instanceCount: number
  affectedFraction: number
  targetErrorRate: number
  incidentStart: number
  instances: Instance[]
  series: TimePoint[]
  logs: LogEntry[]
  logAggregates: LogAggregate[]
  traces: TraceSummary[]
  nodes: DependencyNode[]
  edges: DependencyEdge[]
}
