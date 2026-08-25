import { useMemo, useState } from 'react'
import { ChartPanel } from '../components/ChartPanel'
import { Stat } from '../components/Stat'
import { TimeSeriesChart } from '../components/TimeSeriesChart'
import { filterSeries } from '../data/generateScenario'
import type { Scenario, TimeRange } from '../data/types'

const RANGES: TimeRange[] = ['1h', '6h', '24h', '7d']

interface InstancesViewProps {
  scenario: Scenario
}

export function InstancesView({ scenario }: InstancesViewProps) {
  const [range, setRange] = useState<TimeRange>('6h')
  const data = useMemo(
    () => filterSeries(scenario.series, scenario.now, range),
    [scenario, range],
  )

  const affected = scenario.instances.filter((i) => !i.healthy).length
  const latest = data[data.length - 1]

  return (
    <section>
      <div className="panel-header">
        <div>
          <h1>Instances</h1>
          <p>
            Fleet resource usage looks normal. Per-instance error split is available in the heatmap
            below.
          </p>
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
        <Stat label="Desired pods" value={String(scenario.instanceCount)} />
        <Stat label="Ready pods" value={String(latest?.readyPods ?? scenario.instanceCount)} tone="ok" />
        <Stat
          label="Pods with elevated errors"
          value={`${affected} / ${scenario.instanceCount}`}
          tone="critical"
        />
      </div>

      <div className="chart-grid two">
        <ChartPanel title="CPU usage %" hint="Healthy — no saturation.">
          <TimeSeriesChart
            data={data}
            series={[{ dataKey: 'cpuPct', name: 'CPU %', color: '#7aa2f7' }]}
            yUnit="%"
            yDomain={[0, 100]}
          />
        </ChartPanel>
        <ChartPanel title="Memory usage %">
          <TimeSeriesChart
            data={data}
            series={[{ dataKey: 'memoryPct', name: 'memory %', color: '#3ecf8e' }]}
            yUnit="%"
            yDomain={[0, 100]}
          />
        </ChartPanel>
        <ChartPanel title="CPU throttling %">
          <TimeSeriesChart
            data={data}
            series={[{ dataKey: 'throttlePct', name: 'throttled %', color: '#e6b84d' }]}
            yUnit="%"
            yDomain={[0, 10]}
          />
        </ChartPanel>
        <ChartPanel title="Ready / desired pods">
          <TimeSeriesChart
            data={data}
            series={[
              { dataKey: 'readyPods', name: 'ready', color: '#3ecf8e' },
              { dataKey: 'desiredPods', name: 'desired', color: '#7aa2f7' },
            ]}
            yDomain={[0, scenario.instanceCount + 5]}
          />
        </ChartPanel>
        <ChartPanel title="Network / disk IO">
          <TimeSeriesChart
            data={data}
            series={[
              { dataKey: 'networkIoMBps', name: 'network MB/s', color: '#5cc8ff' },
              { dataKey: 'diskIoMBps', name: 'disk MB/s', color: '#c3a6ff' },
            ]}
          />
        </ChartPanel>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <ChartPanel
          title="Per-instance error rate heatmap"
          hint="Per-pod error rate and the container image SHA each pod is running."
        >
          <div className="instance-heatmap">
            {[...scenario.instances]
              .sort((a, b) => a.id.localeCompare(b.id))
              .map((inst) => (
              <div
                key={inst.id}
                className={`instance-cell ${inst.healthy ? 'good' : 'bad'}`}
                title={`${inst.name}: ${(inst.errorRate * 100).toFixed(1)}% errors · image ${inst.imageSha}`}
              >
                <strong>{inst.id}</strong>
                <div>
                  errors{' '}
                  <span className={`badge ${inst.healthy ? 'ok' : 'bad'}`}>
                    {(inst.errorRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="muted">
                  CPU {inst.cpuPct.toFixed(0)}% · mem {inst.memoryPct.toFixed(0)}%
                </div>
                <div className="muted">
                  image <code>{inst.imageSha}</code>
                </div>
              </div>
            ))}
          </div>
        </ChartPanel>
      </div>
    </section>
  )
}
