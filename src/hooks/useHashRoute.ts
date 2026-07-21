import { useEffect, useState } from 'react'
import type { ViewId } from '../data/types'

const VALID: ViewId[] = ['home', 'requests', 'instances', 'logs', 'traces', 'dependencies']

function parseHash(): ViewId {
  const raw = window.location.hash.replace(/^#\/?/, '') || 'home'
  return VALID.includes(raw as ViewId) ? (raw as ViewId) : 'home'
}

export function useHashRoute(): [ViewId, (view: ViewId) => void] {
  const [view, setView] = useState<ViewId>(parseHash)

  useEffect(() => {
    const onHash = () => setView(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = (next: ViewId) => {
    window.location.hash = next === 'home' ? '' : `#/${next}`
    setView(next)
  }

  return [view, navigate]
}
