import type { ViewId } from '../data/types'

export interface ViewConfig {
  id: Exclude<ViewId, 'home'>
  label: string
  description: string
}

/** Explicit labels for v1 — swap here later for anonymization. */
export const VIEWS: ViewConfig[] = [
  {
    id: 'health',
    label: 'Service Health',
    description: 'Traffic, errors, latency, fleet & DB health',
  },
  {
    id: 'endpoints',
    label: 'Endpoints',
    description: 'Per-endpoint request rate and error rate',
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
  {
    id: 'changelog',
    label: 'Changelog',
    description: 'Recent deployments and configuration changes',
  },
  {
    id: 'dockerfile',
    label: 'Dockerfile',
    description: 'Container image build definition',
  },
  {
    id: 'manifest',
    label: 'Manifest',
    description: 'Kubernetes Deployment manifest',
  },
]
