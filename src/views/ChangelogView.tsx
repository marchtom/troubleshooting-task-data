import { useState } from 'react'
import { ChartPanel } from '../components/ChartPanel'
import { CHANGELOG, type ChangelogEntry } from '../data/artifacts'
import { SCENARIO_NOW } from '../data/generateScenario'

function toUtcDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function dayLabel(date: string): string {
  const nowDate = toUtcDate(SCENARIO_NOW)
  const yesterday = toUtcDate(SCENARIO_NOW - 24 * 60 * 60 * 1000)
  if (date === nowDate) return 'Today'
  if (date === yesterday) return 'Yesterday'
  return date
}

function groupByDay(entries: ChangelogEntry[]): Array<{ label: string; date: string; items: ChangelogEntry[] }> {
  const order: string[] = []
  const map = new Map<string, ChangelogEntry[]>()
  for (const e of entries) {
    if (!map.has(e.date)) {
      map.set(e.date, [])
      order.push(e.date)
    }
    map.get(e.date)!.push(e)
  }
  return order
    .sort((a, b) => (a < b ? 1 : -1))
    .map((date) => ({ label: dayLabel(date), date, items: map.get(date)! }))
}

export function ChangelogView() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const groups = groupByDay(CHANGELOG)

  return (
    <section>
      <div className="panel-header">
        <div>
          <h1>Changelog</h1>
          <p>Recent deployments and configuration changes for this service, by day.</p>
        </div>
      </div>

      <ChartPanel title="Deployments & changes">
        <div className="changelog-days">
          {groups.map((group) => (
            <div key={group.date} className="changelog-day">
              <div className="changelog-day-head">
                <span className="changelog-day-label">{group.label}</span>
                <span className="muted">
                  {group.date} · {group.items.length}{' '}
                  {group.items.length === 1 ? 'change' : 'changes'}
                </span>
              </div>
              <ul className="changelog">
                {group.items.map((entry) => {
                  const isOpen = expanded === entry.id
                  return (
                    <li key={entry.id} className="changelog-item">
                      <div className="changelog-head">
                        <span className={`badge kind-${entry.kind}`}>{entry.kind}</span>
                        <div className="changelog-body">
                          <div className="changelog-title">{entry.title}</div>
                          <div className="muted">
                            <span className="commit-sha">{entry.sha}</span> · {entry.repo} ·{' '}
                            {entry.author}
                          </div>
                        </div>
                        {entry.diff ? (
                          <button
                            type="button"
                            className="btn"
                            onClick={() => setExpanded(isOpen ? null : entry.id)}
                          >
                            {isOpen ? 'Hide diff' : 'View diff'}
                          </button>
                        ) : null}
                      </div>
                      {entry.diff && isOpen ? (
                        <pre className="diff">
                          {entry.diff.map((line, i) => (
                            <div key={i} className={`diff-line ${line.type}`}>
                              {line.text}
                            </div>
                          ))}
                        </pre>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </ChartPanel>
    </section>
  )
}
