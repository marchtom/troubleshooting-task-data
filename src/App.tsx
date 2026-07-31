import { useEffect } from 'react'
import { TopBar } from './components/TopBar'
import { scenario } from './data'
import { useHashRoute } from './hooks/useHashRoute'
import { useUnlockedViews } from './hooks/useUnlockedViews'
import { AllPathsView } from './views/AllPathsView'
import { ChangelogView } from './views/ChangelogView'
import { DependenciesView } from './views/DependenciesView'
import { DockerfileView } from './views/DockerfileView'
import { EndpointsView } from './views/EndpointsView'
import { HomeView } from './views/HomeView'
import { InstancesView } from './views/InstancesView'
import { LogsView } from './views/LogsView'
import { ManifestView } from './views/ManifestView'
import { ServiceHealthView } from './views/ServiceHealthView'
import { TracesView } from './views/TracesView'

export default function App() {
  const [route, navigate] = useHashRoute()
  const { view, changelogVariant } = route
  const { unlocked, unlock, unlockAll, reset } = useUnlockedViews()

  // Visiting a metric view (directly or via a shared link) reveals it in the top navigation.
  useEffect(() => {
    if (view !== 'home' && view !== 'all') unlock(view)
  }, [view, unlock])

  return (
    <div className="app-shell">
      <TopBar
        view={view}
        serviceName={scenario.serviceName}
        unlocked={unlocked}
        onNavigate={navigate}
      />
      <main className="main">
        {view === 'home' ? <HomeView serviceName={scenario.serviceName} /> : null}
        {view === 'health' ? <ServiceHealthView scenario={scenario} /> : null}
        {view === 'endpoints' ? <EndpointsView scenario={scenario} /> : null}
        {view === 'instances' ? <InstancesView scenario={scenario} /> : null}
        {view === 'logs' ? <LogsView scenario={scenario} /> : null}
        {view === 'traces' ? <TracesView /> : null}
        {view === 'dependencies' ? <DependenciesView scenario={scenario} /> : null}
        {view === 'changelog' ? <ChangelogView variant={changelogVariant} /> : null}
        {view === 'dockerfile' ? <DockerfileView /> : null}
        {view === 'manifest' ? <ManifestView /> : null}
        {view === 'all' ? (
          <AllPathsView
            unlocked={unlocked}
            onNavigate={navigate}
            onUnlockAll={unlockAll}
            onReset={reset}
          />
        ) : null}
      </main>
    </div>
  )
}
