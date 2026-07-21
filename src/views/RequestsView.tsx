import { useMemo, useState } from 'react'
import { ChartPanel } from '../components/ChartPanel'
import { Stat } from '../components/Stat'
import { TimeSeriesChart } from '../components/TimeSeriesChart'
import { filterSeries } from '../data/generateScenario'
import type { Scenario, TimeRange } from '../data/types'

const RANGES: TimeRange[] = ['1h', '6h', '24h', '7d']

interface RequestsViewProps {
  scenario: Scenario
}

export function RequestsView({ scenario }: RequestsViewProps) {
  const [range, setRange] = useState<TimeRange>('1h')

  const data = useMemo(
    () => filterSeries(scenario.series, scenario.now, range),
    [scenario, range],
  )

  const latest = data[data.length - 1]
  const chartData = data.map((p) => ({
    ...p,
    errorRatePct: Number((p.errorRate * 100).toFixed(2)),
  }))

  return (
    <section>
      <div className="panel-header">
        <div>
          <h1>Requests</h1>
          <p>Traffic volume, HTTP status mix, and latency — includes daily/weekly seasonality.</p>
        </div>
        <div className="range-group" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={`range-btn ${range === r ? 'active' : ''}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="stat-row">
        <Stat label="Current RPS" value={latest ? latest.requests.toLocaleString() : '—'} />
        <Stat
          label="5xx rate"
          value={latest ? `${(latest.errorRate * 100).toFixed(1)}%` : '—'}
          tone="critical"
        />
        <Stat label="2xx RPS" value={latest ? latest.ok2xx.toLocaleString() : '—'} tone="ok" />
        <Stat label="p90 latency" value={latest ? `${latest.latencyP90} ms` : '—'} />
      </div>

      <div className="chart-grid">
        <ChartPanel
          title="Request volume"
          hint="Seasonal pattern: quieter overnight (UTC), higher during US business hours; weekends lower."
        >
          <TimeSeriesChart
            data={chartData}
            series={[{ dataKey: 'requests', name: 'requests/min bucket', color: '#7aa2f7' }]}
          />
        </ChartPanel>

        <div className="chart-grid two">
          <ChartPanel title="Status codes (absolute)">
            <div className="legend-inline" aria-hidden="true">
              <span>
                <i className="legend-dot" style={{ background: 'var(--series-2xx)' }} />
                2xx
              </span>
              <span>
                <i className="legend-dot" style={{ background: 'var(--series-3xx)' }} />
                3xx
              </span>
              <span>
                <i className="legend-dot" style={{ background: 'var(--series-4xx)' }} />
                4xx
              </span>
              <span>
                <i className="legend-dot" style={{ background: 'var(--series-5xx)' }} />
                5xx
              </span>
            </div>
            <TimeSeriesChart
              data={chartData}
              series={[
                { dataKey: 'ok2xx', name: '2xx', color: '#3ecf8e' },
                { dataKey: 'redirect3xx', name: '3xx', color: '#5cc8ff' },
                { dataKey: 'client4xx', name: '4xx', color: '#e6b84d' },
                { dataKey: 'server5xx', name: '5xx', color: '#f07178' },
              ]}
            />
          </ChartPanel>

          <ChartPanel title="5xx error rate %" hint="Baseline &lt; 0.1%; elevated period stays roughly flat.">
            <TimeSeriesChart
              data={chartData}
              series={[{ dataKey: 'errorRatePct', name: '5xx %', color: '#f07178' }]}
              yUnit="%"
              yDomain={[0, 'auto']}
            />
          </ChartPanel>
        </div>

        <ChartPanel title="Latency percentiles">
          <TimeSeriesChart
            data={chartData}
            series={[
              { dataKey: 'latencyP50', name: 'p50', color: '#7aa2f7' },
              { dataKey: 'latencyP90', name: 'p90', color: '#e6b84d' },
              { dataKey: 'latencyP99', name: 'p99', color: '#f07178' },
            ]}
            yUnit="ms"
          />
        </ChartPanel>
      </div>
    </section>
  )
}
