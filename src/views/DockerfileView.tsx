import { ChartPanel } from '../components/ChartPanel'
import { DOCKERFILE } from '../data/artifacts'

export function DockerfileView() {
  return (
    <section>
      <div className="panel-header">
        <div>
          <h1>Dockerfile</h1>
          <p>Container image build definition for sharing-service.</p>
        </div>
      </div>

      <ChartPanel title="Dockerfile">
        <pre className="code">{DOCKERFILE}</pre>
      </ChartPanel>
    </section>
  )
}
