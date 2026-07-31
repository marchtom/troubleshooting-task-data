import { useEffect, useState } from 'react'
import type { ChangelogVariant } from '../data/artifacts'
import type { ViewId } from '../data/types'

const VALID: ViewId[] = [
  'home',
  'health',
  'endpoints',
  'instances',
  'logs',
  'traces',
  'dependencies',
  'changelog',
  'dockerfile',
  'manifest',
  'all',
]

export interface AppRoute {
  view: ViewId
  changelogVariant: ChangelogVariant
}

function hashFor(view: ViewId, changelogVariant: ChangelogVariant): string {
  if (view === 'home') return ''
  if (view === 'changelog') {
    return changelogVariant === 'senior' ? '#/changelog-senior' : '#/changelog-swe'
  }
  return `#/${view}`
}

function parseHash(): AppRoute {
  const raw = window.location.hash.replace(/^#\/?/, '') || 'home'

  if (raw === 'changelog-senior') {
    return { view: 'changelog', changelogVariant: 'senior' }
  }
  if (raw === 'changelog-swe' || raw === 'changelog') {
    return { view: 'changelog', changelogVariant: 'swe' }
  }

  const view = VALID.includes(raw as ViewId) ? (raw as ViewId) : 'home'
  return { view, changelogVariant: 'swe' }
}

export function useHashRoute(): [AppRoute, (view: ViewId) => void] {
  const [route, setRoute] = useState<AppRoute>(parseHash)

  useEffect(() => {
    const onHash = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = (next: ViewId) => {
    const nextRoute: AppRoute = {
      view: next,
      changelogVariant: route.changelogVariant,
    }
    window.location.hash = hashFor(nextRoute.view, nextRoute.changelogVariant)
    setRoute(nextRoute)
  }

  return [route, navigate]
}
