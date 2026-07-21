import { useState } from 'react'
import { ChartPanel } from '../components/ChartPanel'
import type { Scenario, TraceSummary } from '../data/types'

interface TracesViewProps {
  scenario: Scenario
}

function Waterfall({ trace }: { trace: TraceSummary }) {
  const max = Math.max(...trace.spans.map((s) => s.startMs + s.durationMs), 1)

  return (
    <div className="waterfall">
      {trace.spans.map((span) => {
        const left = (span.startMs / max) * 100
        const width = Math.max(2, (span.durationMs / max) * 100)
        return (
          <div key={span.id} className="span-row">
            <div>
              <strong>{span.service}</strong>
              <div className="muted">{span.operation}</div>
              {span.detail ? <div className="muted">{span.detail}</div> : null}
            </div>
            <div className="span-track" aria-hidden="true">
              <div
                className={`span-bar ${span.status === 'error' ? 'error' : ''}`}
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            </div>
            <div>{span.durationMs} ms</div>
          </div>
        )
      })}
    </div>
  )
}

export function TracesView({ scenario }: TracesViewProps) {
  const [selectedId, setSelectedId] = useState(scenario.traces[0]?.id)
  const selected = scenario.traces.find((t) => t.id === selectedId) ?? scenario.traces[0]

  return (
    <section>
      <div className="panel-header">
        <div>
          <h1>Traces</h1>
          <p>Sampled waterfalls. Failed requests stop inside the service before reaching the DB.</p>
        </div>
      </div>

      <div className="trace-list" role="list">
        {scenario.traces.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`trace-item ${selected?.id === t.id ? 'active' : ''}`}
            onClick={() => setSelectedId(t.id)}
            role="listitem"
          >
            <strong>
              {t.endpoint}{' '}
              <span className={`badge ${t.status === 'ok' ? 'ok' : 'bad'}`}>
                {t.statusCode}
              </span>
            </strong>
            <div className="muted">
              {t.durationMs} ms · {t.rootCause}
            </div>
          </button>
        ))}
      </div>

      {selected ? (
        <ChartPanel title={`Trace ${selected.id}`}>
          <Waterfall trace={selected} />
        </ChartPanel>
      ) : null}
    </section>
  )
}
