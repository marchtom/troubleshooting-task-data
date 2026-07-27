export type ViewId =
  | 'home'
  | 'health'
  | 'endpoints'
  | 'instances'
  | 'logs'
  | 'traces'
  | 'dependencies'
  | 'changelog'
  | 'dockerfile'
  | 'manifest'
  | 'all'

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
  readyPods: number
  desiredPods: number
  healthyInstances: number
  dbLatencyMs: number
  dbActiveConnections: number
  networkIoMBps: number
  diskIoMBps: number
}

export interface Instance {
  id: string
  name: string
  healthy: boolean
  configVersion: 'vPrev' | 'vNew'
  imageSha: string
  errorRate: number
  cpuPct: number
  memoryPct: number
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
  nodes: DependencyNode[]
  edges: DependencyEdge[]
}
