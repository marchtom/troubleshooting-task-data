import { VIEWS } from '../config/views'
import type { ViewId } from '../data/types'

interface HomeViewProps {
  serviceName: string
  onNavigate: (view: ViewId) => void
}

export function HomeView({ serviceName, onNavigate }: HomeViewProps) {
  return (
    <section className="home">
      <div>
        <h1>{serviceName}</h1>
        <p className="home-lead">
          Interview console for production investigation. Open a metric view when
          the candidate asks for that signal. Views are intentionally separate so
          signals are revealed progressively.
        </p>
      </div>
      <div className="view-grid">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className="view-card"
            onClick={() => onNavigate(v.id)}
          >
            <h2>{v.label}</h2>
            <p>{v.description}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
