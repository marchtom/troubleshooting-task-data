import { useMemo, useState } from 'react'
import { ChartPanel } from '../components/ChartPanel'
import { Stat } from '../components/Stat'
import { TimeSeriesChart } from '../components/TimeSeriesChart'
import { filterSeries } from '../data/generateScenario'
import type { Scenario } from '../data/types'

interface DependenciesViewProps {
  scenario: Scenario
}

export function DependenciesView({ scenario }: DependenciesViewProps) {
  const [showDbDetail, setShowDbDetail] = useState(false)
  const data = useMemo(
    () => filterSeries(scenario.series, scenario.now, '6h'),
    [scenario],
  )

  const upstream = scenario.nodes.filter((n) => n.role === 'upstream')
  const self = scenario.nodes.find((n) => n.role === 'self')
  const downstream = scenario.nodes.filter((n) => n.role === 'downstream')

  return (
    <section>
      <div className="panel-header">
        <div>
          <h1>Dependencies</h1>
          <p>
            Upstream callers show elevated errors (symptom). Downstream dependencies are healthy.
          </p>
        </div>
        <button type="button" className="btn" onClick={() => setShowDbDetail((v) => !v)}>
          {showDbDetail ? 'Hide DB detail' : 'Show DB detail'}
        </button>
      </div>

      <div className="stat-row">
        <Stat label="Self error rate" value="25.0%" tone="critical" />
        <Stat label="Downstream health" value="All Ok" tone="ok" />
        <Stat label="DB query latency" value="~12 ms" tone="ok" />
        <Stat label="Replication lag" value="< 40 ms" tone="ok" />
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

      {showDbDetail ? (
        <div style={{ marginTop: '0.85rem' }} className="chart-grid two">
          <ChartPanel
            title="DB query latency (limited insight)"
            hint="Owned by another team — only coarse latency/replication signals available."
          >
            <TimeSeriesChart
              data={data}
              series={[{ dataKey: 'dbLatencyMs', name: 'query latency ms', color: '#3ecf8e' }]}
              yUnit="ms"
            />
          </ChartPanel>
          <ChartPanel title="DB replication lag">
            <TimeSeriesChart
              data={data}
              series={[{ dataKey: 'dbReplicationLagMs', name: 'lag ms', color: '#7aa2f7' }]}
              yUnit="ms"
            />
          </ChartPanel>
        </div>
      ) : null}
    </section>
  )
}
