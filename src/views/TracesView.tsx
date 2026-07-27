import { ChartPanel } from '../components/ChartPanel'

export function TracesView() {
  return (
    <section>
      <div className="panel-header">
        <div>
          <h1>Traces</h1>
          <p>Distributed tracing (APM) for this service.</p>
        </div>
      </div>

      <ChartPanel title="Sampled traces">
        <div className="empty-state">
          <p className="empty-title">No traces available for sharing-service</p>
          <p className="muted">
            This service is not currently reporting spans to the tracing backend. No sampled traces
            were found for the selected window.
          </p>
        </div>
      </ChartPanel>
    </section>
  )
}
