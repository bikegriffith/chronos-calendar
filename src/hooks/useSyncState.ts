import { useState, useEffect } from 'react'
import { getSyncState, subscribeToSyncState, type SyncState } from '@/services/syncService'

export function useSyncState(): SyncState {
  const [state, setState] = useState<SyncState>({
    status: 'idle',
    lastSyncAt: null,
    lastError: null,
    isOnline: true,
    pendingCount: 0,
    cacheTimestamp: null,
  })

  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      getSyncState().then((s) => {
        if (!cancelled) setState(s)
      })
    }
    refresh()
    const unsub = subscribeToSyncState(refresh)
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  return state
}
