import { useMemo, useState } from 'react'
import { ChartPanel } from '../components/ChartPanel'
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
  const [selected, setSelected] = useState<LogEntry | null>(null)

  const filtered = useMemo(() => {
    const list = level === 'all' ? scenario.logs : scenario.logs.filter((l) => l.level === level)
    return list.slice(0, 400)
  }, [scenario.logs, level])

  return (
    <section>
      <div className="panel-header">
        <div>
          <h1>Logs</h1>
          <p>
            Dense unstructured stream (~thousands/min). Filter by level — aggregates appear for
            errors.
          </p>
        </div>
        <div className="chip-group" role="group" aria-label="Log level filter">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              className={`chip ${level === l ? 'active' : ''}`}
              onClick={() => setLevel(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="logs-layout">
        <ChartPanel title="Error aggregates" hint="Shown after filtering the stream to error.">
          {level === 'error' ? (
            <ul className="agg-list">
              {scenario.logAggregates.map((a) => (
                <li key={a.key} className={`agg-item ${a.kind === 'pool' ? 'pool' : ''}`}>
                  <span>{a.label}</span>
                  <span>
                    {a.count.toLocaleString()} · {a.pct.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Filter to error to see aggregates and dominant exception patterns.</p>
          )}
        </ChartPanel>

        <div>
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
