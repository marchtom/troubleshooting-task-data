import { ChartPanel } from '../components/ChartPanel'
import { VIEWS } from '../config/views'
import type { ViewId } from '../data/types'

interface AllPathsViewProps {
  unlocked: ViewId[]
  onNavigate: (view: ViewId) => void
  onUnlockAll: () => void
  onReset: () => void
}

type DirectoryRow = {
  key: string
  label: string
  description: string
  path: string
  unlockId: ViewId
  open: () => void
}

function absoluteLink(path: string): string {
  const { origin, pathname, search } = window.location
  const hash = path.startsWith('#') ? path : `#/${path}`
  return `${origin}${pathname}${search}${hash}`
}

export function AllPathsView({ unlocked, onNavigate, onUnlockAll, onReset }: AllPathsViewProps) {
  const copy = (path: string) => {
    navigator.clipboard?.writeText(absoluteLink(path)).catch(() => {})
  }

  const openHash = (path: string) => {
    window.location.hash = path.startsWith('#') ? path : `#/${path}`
  }

  const rows: DirectoryRow[] = VIEWS.flatMap((v): DirectoryRow[] => {
    if (v.id === 'changelog') {
      return [
        {
          key: 'changelog-swe',
          label: 'Changelog · SWE 2/3',
          description: `${v.description} (config deploy ~15:50 UTC)`,
          path: '#/changelog-swe',
          unlockId: 'changelog',
          open: () => openHash('#/changelog-swe'),
        },
        {
          key: 'changelog-senior',
          label: 'Changelog · Senior/Staff',
          description: `${v.description} (config deploy ~10:00 UTC)`,
          path: '#/changelog-senior',
          unlockId: 'changelog',
          open: () => openHash('#/changelog-senior'),
        },
      ]
    }
    return [
      {
        key: v.id,
        label: v.label,
        description: v.description,
        path: `#/${v.id}`,
        unlockId: v.id,
        open: () => onNavigate(v.id),
      },
    ]
  })

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
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td className="muted">{row.description}</td>
                <td>
                  <code>{row.path}</code>
                </td>
                <td>
                  <span className={`badge ${unlocked.includes(row.unlockId) ? 'ok' : ''}`}>
                    {unlocked.includes(row.unlockId) ? 'unlocked' : 'hidden'}
                  </span>
                </td>
                <td>
                  <div className="path-actions">
                    <button type="button" className="btn" onClick={row.open}>
                      Open
                    </button>
                    <button type="button" className="btn" onClick={() => copy(row.path)}>
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
