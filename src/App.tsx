import { TopBar } from './components/TopBar'
import { scenario } from './data'
import { useHashRoute } from './hooks/useHashRoute'
import { DependenciesView } from './views/DependenciesView'
import { HomeView } from './views/HomeView'
import { InstancesView } from './views/InstancesView'
import { LogsView } from './views/LogsView'
import { RequestsView } from './views/RequestsView'
import { TracesView } from './views/TracesView'

export default function App() {
  const [view, navigate] = useHashRoute()

  return (
    <div className="app-shell">
      <TopBar view={view} serviceName={scenario.serviceName} onNavigate={navigate} />
      <main className="main">
        {view === 'home' ? (
          <HomeView serviceName={scenario.serviceName} onNavigate={navigate} />
        ) : null}
        {view === 'requests' ? <RequestsView scenario={scenario} /> : null}
        {view === 'instances' ? <InstancesView scenario={scenario} /> : null}
        {view === 'logs' ? <LogsView scenario={scenario} /> : null}
        {view === 'traces' ? <TracesView scenario={scenario} /> : null}
        {view === 'dependencies' ? <DependenciesView scenario={scenario} /> : null}
      </main>
    </div>
  )
}
