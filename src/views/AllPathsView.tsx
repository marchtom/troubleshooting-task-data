import { ChartPanel } from '../components/ChartPanel'
import { VIEWS } from '../config/views'
import type { ViewId } from '../data/types'

interface AllPathsViewProps {
  unlocked: ViewId[]
  onNavigate: (view: ViewId) => void
  onUnlockAll: () => void
  onReset: () => void
}

function linkFor(id: ViewId): string {
  const { origin, pathname, search } = window.location
  return `${origin}${pathname}${search}#/${id}`
}

export function AllPathsView({ unlocked, onNavigate, onUnlockAll, onReset }: AllPathsViewProps) {
  const copy = (id: ViewId) => {
    navigator.clipboard?.writeText(linkFor(id)).catch(() => {})
  }

  return (
    <section>
      <div className="panel-header">
        <div>
          <h1>All paths (interviewer)</h1>
          <p>
            Directory of every view. Share a link to reveal that tab to the candidate — it then
            stays available in their top navigation.
          </p>
        </div>
        <div className="path-actions">
          <button type="button" className="btn" onClick={onUnlockAll}>
            Reveal all tabs
          </button>
          <button type="button" className="btn" onClick={onReset}>
            Reset unlocked
          </button>
        </div>
      </div>

      <ChartPanel title="Views">
        <table className="data">
          <thead>
            <tr>
              <th>View</th>
              <th>Description</th>
              <th>Path</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {VIEWS.map((v) => (
              <tr key={v.id}>
                <td>{v.label}</td>
                <td className="muted">{v.description}</td>
                <td>
                  <code>#/{v.id}</code>
                </td>
                <td>
                  <span className={`badge ${unlocked.includes(v.id) ? 'ok' : ''}`}>
                    {unlocked.includes(v.id) ? 'unlocked' : 'hidden'}
                  </span>
                </td>
                <td>
                  <div className="path-actions">
                    <button type="button" className="btn" onClick={() => onNavigate(v.id)}>
                      Open
                    </button>
                    <button type="button" className="btn" onClick={() => copy(v.id)}>
                      Copy link
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ChartPanel>
    </section>
  )
}
