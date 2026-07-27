import { useMemo, useState } from 'react'
import { ChartPanel } from '../components/ChartPanel'
import { TimeSeriesChart } from '../components/TimeSeriesChart'
import {
  ENDPOINT_DEFS,
  endpointErrorPct,
  endpointRequests,
  filterSeries,
} from '../data/generateScenario'
import type { Scenario, TimeRange } from '../data/types'

const RANGES: TimeRange[] = ['1h', '6h', '24h', '7d']

interface EndpointsViewProps {
  scenario: Scenario
}

export function EndpointsView({ scenario }: EndpointsViewProps) {
  const [range, setRange] = useState<TimeRange>('1h')

  const data = useMemo(
    () => filterSeries(scenario.series, scenario.now, range),
    [scenario, range],
  )

  const chartData = useMemo(
    () =>
      data.map((p) => {
        const row: Record<string, string | number> = { label: p.label }
        for (const def of ENDPOINT_DEFS) {
          row[`req_${def.id}`] = endpointRequests(p, def)
          row[`err_${def.id}`] = endpointErrorPct(p, def)
        }
        return row
      }),
    [data],
  )

  const reqSeries = ENDPOINT_DEFS.map((d) => ({
    dataKey: `req_${d.id}`,
    name: d.label,
    color: d.color,
  }))
  const errSeries = ENDPOINT_DEFS.map((d) => ({
    dataKey: `err_${d.id}`,
    name: d.label,
    color: d.color,
  }))

  return (
    <section>
      <div className="panel-header">
        <div>
          <h1>Endpoints</h1>
          <p>Per-endpoint request rate and error rate over time.</p>
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

      <div className="chart-grid">
        <ChartPanel title="Requests/s per endpoint" hint="Daily/weekly seasonality in traffic.">
          <TimeSeriesChart data={chartData} series={reqSeries} />
        </ChartPanel>

        <ChartPanel title="Error rate % per endpoint">
          <TimeSeriesChart data={chartData} series={errSeries} yUnit="%" yDomain={[0, 'auto']} />
        </ChartPanel>
      </div>
    </section>
  )
}
