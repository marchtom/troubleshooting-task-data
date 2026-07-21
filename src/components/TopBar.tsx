import { VIEWS } from '../config/views'
import type { ViewId } from '../data/types'

interface TopBarProps {
  view: ViewId
  serviceName: string
  onNavigate: (view: ViewId) => void
}

export function TopBar({ view, serviceName, onNavigate }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-title">Observability Console</div>
        <div className="brand-sub">
          Service: {serviceName} · env: prod · frozen snapshot
        </div>
      </div>
      <nav className="nav-pills" aria-label="Metric views">
        <button
          type="button"
          className={`nav-pill ${view === 'home' ? 'active' : ''}`}
          onClick={() => onNavigate('home')}
        >
          Home
        </button>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`nav-pill ${view === v.id ? 'active' : ''}`}
            onClick={() => onNavigate(v.id)}
          >
            {v.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
