import { SCENARIO_NOW } from '../data/generateScenario'

interface HomeViewProps {
  serviceName: string
}

const NOW_LABEL = new Date(SCENARIO_NOW).toLocaleString('en-US', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function HomeView({ serviceName }: HomeViewProps) {
  return (
    <section className="home">
      <div className="home-brief">
        <span className="badge bad">Incident</span>
        <h1>{serviceName}</h1>
        <p className="home-lead">
          You got a message on Slack: <strong>{serviceName}</strong> is returning a high rate of
          errors. Please look into this.
        </p>
        <ul className="home-context">
          <li>
            You are currently the on-call engineer for your domain. <strong>{serviceName}</strong>{' '}
            is one of the services in that domain.
          </li>
          <li>It is currently {NOW_LABEL} UTC.</li>
          <li>
            About 30 minutes ago, multiple internal teams started reporting requests failing
            intermittently — some succeed, some fail.
          </li>
          <li>You are not deeply familiar with this service's code.</li>
          <li>Reliability gaps have been raised about this service in the past.</li>
        </ul>
        <p className="home-lead">Investigate and find the root cause.</p>
      </div>
    </section>
  )
}
