import { useCallback, useEffect, useState } from 'react'
import { VIEWS } from '../config/views'
import type { ViewId } from '../data/types'

const STORAGE_KEY = 'troubleshooting.unlockedViews'

function readStored(): ViewId[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ViewId[]) : []
  } catch {
    return []
  }
}

function writeStored(views: ViewId[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(views))
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function useUnlockedViews() {
  const [unlocked, setUnlocked] = useState<ViewId[]>(readStored)

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setUnlocked(readStored())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const unlock = useCallback((id: ViewId) => {
    setUnlocked((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      writeStored(next)
      return next
    })
  }, [])

  const unlockAll = useCallback(() => {
    const all = VIEWS.map((v) => v.id) as ViewId[]
    writeStored(all)
    setUnlocked(all)
  }, [])

  const reset = useCallback(() => {
    writeStored([])
    setUnlocked([])
  }, [])

  return { unlocked, unlock, unlockAll, reset }
}
