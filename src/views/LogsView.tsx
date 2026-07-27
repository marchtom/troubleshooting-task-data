import { useMemo, useState } from 'react'
import { ChartPanel } from '../components/ChartPanel'
import { errorBucket } from '../data/generateScenario'
import type { LogEntry, LogLevel, Scenario } from '../data/types'

const LEVELS: Array<LogLevel | 'all'> = ['all', 'error', 'warn', 'info', 'debug']

interface LogsViewProps {
  scenario: Scenario
}

function formatTime(t: number): string {
  return new Date(t).toLocaleTimeString('en-US', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function LogsView({ scenario }: LogsViewProps) {
  const [level, setLevel] = useState<LogLevel | 'all'>('all')
  const [bucket, setBucket] = useState<string | null>(null)
  const [selected, setSelected] = useState<LogEntry | null>(null)

  const filtered = useMemo(() => {
    let list: LogEntry[]
    if (bucket) {
      list = scenario.logs.filter((l) => l.level === 'error' && errorBucket(l).key === bucket)
    } else if (level === 'all') {
      list = scenario.logs
    } else {
      list = scenario.logs.filter((l) => l.level === level)
    }
    return list.slice(0, 400)
  }, [scenario.logs, level, bucket])

  const activeAgg = bucket ? scenario.logAggregates.find((a) => a.key === bucket) : null

  const sortedAggregates = useMemo(() => {
    const statusOf = (label: string) => {
      const n = parseInt(label, 10)
      return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n
    }
    return [...scenario.logAggregates].sort((a, b) => statusOf(a.label) - statusOf(b.label))
  }, [scenario.logAggregates])

  const selectLevel = (l: LogLevel | 'all') => {
    setBucket(null)
    setLevel(l)
  }

  const selectBucket = (key: string) => {
    setBucket((prev) => (prev === key ? null : key))
  }

  return (
    <section>
      <div className="panel-header">
        <div>
          <h1>Logs</h1>
          <p>
            Dense unstructured stream (~thousands/min). Filter by level, or click an error bucket on
            the left to show only that error type.
          </p>
        </div>
        <div className="chip-group" role="group" aria-label="Log level filter">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              className={`chip ${!bucket && level === l ? 'active' : ''}`}
              onClick={() => selectLevel(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="logs-layout">
        <ChartPanel title="Error aggregates">
          <p className="muted agg-hint">
            Grouped across all errors in the window. Click a bucket to filter the stream to that
            error type; click again to clear.
          </p>
          <ul className="agg-list">
            {sortedAggregates.map((a) => (
              <li key={a.key}>
                <button
                  type="button"
                  className={`agg-item ${bucket === a.key ? 'active' : ''}`}
                  aria-pressed={bucket === a.key}
                  onClick={() => selectBucket(a.key)}
                >
                  <span>{a.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </ChartPanel>

        <div>
          {activeAgg ? (
            <div className="filter-bar">
              <span>
                Showing <strong>{activeAgg.label}</strong> ({activeAgg.count.toLocaleString()}{' '}
                entries)
              </span>
              <button type="button" className="btn" onClick={() => setBucket(null)}>
                Clear filter
              </button>
            </div>
          ) : null}
          <div className="log-stream" role="list" aria-label="Log stream">
            {filtered.map((log) => (
              <button
                key={log.id}
                type="button"
                className="log-row"
                role="listitem"
                onClick={() => setSelected(log)}
              >
                <span>{formatTime(log.t)}</span>
                <span className={`log-level ${log.level}`}>{log.level}</span>
                <span>
                  [{log.instance.split('-').slice(-2).join('-')}] {log.message}
                  {log.statusCode ? ` status=${log.statusCode}` : ''}
                </span>
              </button>
            ))}
          </div>

          {selected ? (
            <div className="stack-panel">
              <strong>Selected log</strong>
              <p className="muted">
                {formatTime(selected.t)} · {selected.instance} · {selected.level}
                {selected.exception ? ` · ${selected.exception}` : ''}
              </p>
              <p>{selected.message}</p>
              {selected.stackTrace ? <pre>{selected.stackTrace}</pre> : (
                <p className="muted">No stack trace on this entry.</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
