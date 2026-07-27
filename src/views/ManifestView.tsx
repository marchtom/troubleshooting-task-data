import { ChartPanel } from '../components/ChartPanel'
import { K8S_MANIFEST } from '../data/artifacts'

export function ManifestView() {
  return (
    <section>
      <div className="panel-header">
        <div>
          <h1>Kubernetes manifest</h1>
          <p>Deployment manifest for sharing-service.</p>
        </div>
      </div>

      <ChartPanel title="deployment.yaml">
        <pre className="code">{K8S_MANIFEST}</pre>
      </ChartPanel>
    </section>
  )
}
