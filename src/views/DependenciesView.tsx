import { ChartPanel } from '../components/ChartPanel'
import { Stat } from '../components/Stat'
import type { Scenario } from '../data/types'

interface DependenciesViewProps {
  scenario: Scenario
}

export function DependenciesView({ scenario }: DependenciesViewProps) {
  const upstream = scenario.nodes.filter((n) => n.role === 'upstream')
  const self = scenario.nodes.find((n) => n.role === 'self')
  const downstream = scenario.nodes.filter((n) => n.role === 'downstream')

  return (
    <section>
      <div className="panel-header">
        <div>
          <h1>Dependencies</h1>
          <p>Upstream callers and downstream services for this service.</p>
        </div>
      </div>

      <div className="stat-row">
        <Stat label="Self error rate" value="25.0%" tone="critical" />
        <Stat label="Downstream health" value="All Ok" tone="ok" />
        <Stat label="DB query latency" value="~24 ms" tone="ok" />
      </div>

      <div className="dep-map" aria-label="Service dependency map">
        <div className="dep-col">
          <h3>Upstream callers</h3>
          {upstream.map((n) => (
            <div key={n.id} className={`dep-node ${n.health.toLowerCase()}`}>
              <strong>{n.name}</strong>
              <div className="dep-meta">
                {n.requestCount.toLocaleString()} req · {n.errorRate.toFixed(1)}% err · p90{' '}
                {n.latencyP90} ms · {n.health}
              </div>
              {n.note ? <div className="dep-meta">{n.note}</div> : null}
            </div>
          ))}
        </div>

        <div className="dep-col">
          <h3>This service</h3>
          {self ? (
            <div className={`dep-node self ${self.health.toLowerCase()}`}>
              <strong>{self.name}</strong>
              <div className="dep-meta">
                {self.requestCount.toLocaleString()} req · {self.errorRate.toFixed(1)}% err · p90{' '}
                {self.latencyP90} ms · {self.health}
              </div>
            </div>
          ) : null}
        </div>

        <div className="dep-col">
          <h3>Downstream</h3>
          {downstream.map((n) => (
            <div key={n.id} className={`dep-node ${n.health.toLowerCase()}`}>
              <strong>{n.name}</strong>
              <div className="dep-meta">
                {n.requestCount.toLocaleString()} req · {n.errorRate.toFixed(2)}% err · p90{' '}
                {n.latencyP90} ms · {n.health}
              </div>
              {n.note ? <div className="dep-meta">{n.note}</div> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="edge-list">
        <ChartPanel title="Edges">
          <table className="data">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Requests</th>
                <th>Error %</th>
                <th>p90</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {scenario.edges.map((e) => (
                <tr key={`${e.from}-${e.to}`}>
                  <td>{scenario.nodes.find((n) => n.id === e.from)?.name}</td>
                  <td>{scenario.nodes.find((n) => n.id === e.to)?.name}</td>
                  <td>{e.requestCount.toLocaleString()}</td>
                  <td>{e.errorRate.toFixed(2)}%</td>
                  <td>{e.latencyP90} ms</td>
                  <td>{e.health}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ChartPanel>
      </div>
    </section>
  )
}
