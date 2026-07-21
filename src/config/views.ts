import type { ViewId } from '../data/types'

export interface ViewConfig {
  id: Exclude<ViewId, 'home'>
  label: string
  description: string
}

/** Explicit labels for v1 — swap here later for anonymization. */
export const VIEWS: ViewConfig[] = [
  {
    id: 'requests',
    label: 'Requests',
    description: 'Traffic volume, status codes, and latency',
  },
  {
    id: 'instances',
    label: 'Instances',
    description: 'Fleet health, resources, and per-instance signals',
  },
  {
    id: 'logs',
    label: 'Logs',
    description: 'Unstructured log stream with level filters',
  },
  {
    id: 'traces',
    label: 'Traces',
    description: 'Sampled request waterfalls',
  },
  {
    id: 'dependencies',
    label: 'Dependencies',
    description: 'Upstream callers and downstream services',
  },
]
