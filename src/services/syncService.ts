/**
 * Offline-first sync: cache in IndexedDB, background sync every 5 minutes,
 * queue mutations when offline, sync on reconnect. Server wins on conflict.
 */

import {
  getCalendarList,
  getEvents,
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  deleteEvent as apiDeleteEvent,
  type CalendarAccount,
  type CalendarEvent,
  type DateRange,
  type GetEventsOptions,
} from './calendarService'
import type { NewEventInput, UpdateEventPatch } from '@/store/calendarStore'
import {
  putCachedEvents,
  getCachedEventsInRange,
  pruneEventsOutsideWindow,
  setSyncMeta,
  getAllSyncMeta,
  addPendingMutation,
  getPendingMutations,
  removePendingMutation,
  applyCachedEvent,
  removeCachedEvent,
  setCachedCalendarList,
  getCachedCalendarList,
  getCalendarListCachedAt,
} from './calendarDb'

const SYNC_INTERVAL_MS = 5 * 60 * 1000
const THREE_MONTHS_MS = 3 * 30 * 24 * 60 * 60 * 1000

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

export interface SyncState {
  status: SyncStatus
  lastSyncAt: Date | null
  lastError: string | null
  isOnline: boolean
  pendingCount: number
  /** When showing cached data, when the cache was last updated (per calendar or global). */
  cacheTimestamp: Date | null
}

const state: {
  status: SyncStatus
  lastSyncAt: Date | null
  lastError: string | null
  cacheTimestamp: Date | null
  listeners: Set<() => void>
  syncIntervalId: ReturnType<typeof setInterval> | null
} = {
  status: 'idle',
  lastSyncAt: null,
  lastError: null,
  cacheTimestamp: null,
  listeners: new Set(),
  syncIntervalId: null,
}

function getIsOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine
}

function notifyListeners(): void {
  state.listeners.forEach((cb) => cb())
}

export function subscribeToSyncState(callback: () => void): () => void {
  state.listeners.add(callback)
  return () => state.listeners.delete(callback)
}

async function getPendingCount(): Promise<number> {
  const list = await getPendingMutations()
  return list.length
}

export async function getSyncState(): Promise<SyncState> {
  const pendingCount = await getPendingCount()
  return {
    status: state.status,
    lastSyncAt: state.lastSyncAt,
    lastError: state.lastError,
    isOnline: getIsOnline(),
    pendingCount,
    cacheTimestamp: state.cacheTimestamp,
  }
}

/** Get calendar list: from network when online, else from cache. */
export async function getCalendarsWithCache(): Promise<{
  calendars: CalendarAccount[]
  fromCache: boolean
  cachedAt: Date | null
}> {
  if (getIsOnline()) {
    try {
      const calendars = await getCalendarList()
      await setCachedCalendarList(calendars)
      return { calendars, fromCache: false, cachedAt: null }
    } catch {
      const cached = await getCachedCalendarList()
      const cachedAt = await getCalendarListCachedAt()
      return {
        calendars: cached ?? [],
        fromCache: true,
        cachedAt: cachedAt ? new Date(cachedAt) : null,
      }
    }
  }
  const cached = await getCachedCalendarList()
  const cachedAt = await getCalendarListCachedAt()
  return {
    calendars: cached ?? [],
    fromCache: true,
    cachedAt: cachedAt ? new Date(cachedAt) : null,
  }
}

/** Get events: try network when online, then merge into cache; when offline or on error, return cache for range. */
export async function getEventsWithCache(
  calendarIds: string[],
  dateRange: DateRange,
  options: GetEventsOptions & { omitOrderBy?: boolean } = {}
): Promise<{ events: CalendarEvent[]; fromCache: boolean; cacheTimestamp: Date | null }> {
  const rangeStart = dateRange.start
  const rangeEnd = dateRange.end

  if (getIsOnline()) {
    try {
      const events = await getEvents(calendarIds, dateRange, options)
      for (const calendarId of calendarIds) {
        const calEvents = events.filter((e) => e.calendarId === calendarId)
        await putCachedEvents(calendarId, calEvents)
      }
      const now = new Date().toISOString()
      for (const calendarId of calendarIds) {
        await setSyncMeta(calendarId, now)
      }
      state.cacheTimestamp = new Date()
      state.lastError = null
      notifyListeners()
      await pruneEventsOutsideWindow()
      return { events, fromCache: false, cacheTimestamp: state.cacheTimestamp }
    } catch (err) {
      state.lastError = err instanceof Error ? err.message : 'Sync failed'
      state.status = 'error'
      notifyListeners()
    }
  }

  const cached = await getCachedEventsInRange(calendarIds, rangeStart, rangeEnd)
  const meta = await getAllSyncMeta()
  const lastSyncDates = calendarIds.map((id) => meta.get(id)).filter(Boolean) as string[]
  const latestSync =
    lastSyncDates.length > 0
      ? new Date(Math.max(...lastSyncDates.map((d) => new Date(d).getTime())))
      : null
  state.cacheTimestamp = latestSync
  notifyListeners()
  return {
    events: cached,
    fromCache: true,
    cacheTimestamp: state.cacheTimestamp,
  }
}

/** Run incremental sync for one or all calendars (fetch only changed since last sync). */
async function runIncrementalSync(calendarIds: string[]): Promise<void> {
  if (!getIsOnline()) return
  state.status = 'syncing'
  state.lastError = null
  notifyListeners()

  const now = new Date()
  const rangeStart = new Date(now.getTime() - THREE_MONTHS_MS / 2).toISOString()
  const rangeEnd = new Date(now.getTime() + THREE_MONTHS_MS / 2).toISOString()
  const dateRange: DateRange = { start: rangeStart, end: rangeEnd }
  const meta = await getAllSyncMeta()

  try {
    for (const calendarId of calendarIds) {
      const updatedMin = meta.get(calendarId)
      const options: GetEventsOptions = {
        ...(updatedMin && { updatedMin, showDeleted: true }),
      }
      const events = await getEvents([calendarId], dateRange, options)
      await putCachedEvents(calendarId, events)
      await setSyncMeta(calendarId, now.toISOString())
    }
    await pruneEventsOutsideWindow()
    state.lastSyncAt = new Date()
    state.cacheTimestamp = state.lastSyncAt
    state.status = 'idle'
    state.lastError = null
  } catch (err) {
    state.lastError = err instanceof Error ? err.message : 'Sync failed'
    state.status = 'error'
  }
  notifyListeners()
}

/** Full sync (no updatedMin) for the given date range; used when UI requests a range. */
export async function syncCalendarRange(
  calendarIds: string[],
  dateRange: DateRange,
  options: GetEventsOptions = {}
): Promise<void> {
  if (!getIsOnline()) return
  state.status = 'syncing'
  notifyListeners()
  try {
    const events = await getEvents(calendarIds, dateRange, options)
    for (const calendarId of calendarIds) {
      const calEvents = events.filter((e) => e.calendarId === calendarId)
      await putCachedEvents(calendarId, calEvents)
    }
    const now = new Date().toISOString()
    for (const calendarId of calendarIds) {
      await setSyncMeta(calendarId, now)
    }
    state.lastSyncAt = new Date()
    state.cacheTimestamp = state.lastSyncAt
    state.lastError = null
    state.status = 'idle'
    await pruneEventsOutsideWindow()
  } catch (err) {
    state.lastError = err instanceof Error ? err.message : 'Sync failed'
    state.status = 'error'
  }
  notifyListeners()
}

/** Background sync: incremental every 5 minutes. */
async function backgroundSync(): Promise<void> {
  if (!getIsOnline()) {
    state.status = 'offline'
    notifyListeners()
    return
  }
  const calendars = await getCachedCalendarList()
  const calendarIds = calendars?.map((c) => c.id) ?? []
  if (calendarIds.length === 0) return
  await runIncrementalSync(calendarIds)
}

/** Flush pending mutations when back online (server wins: we just push and then refetch). */
async function flushPendingMutations(): Promise<void> {
  const pending = await getPendingMutations()
  for (const mut of pending) {
    try {
      if (mut.type === 'create') {
        if (mut.tempEventId) await removeCachedEvent(mut.calendarId, mut.tempEventId)
        const created = await apiCreateEvent(mut.calendarId, mut.payload as NewEventInput)
        await applyCachedEvent(mut.calendarId, created)
      } else if (mut.type === 'update' && mut.eventId) {
        const updated = await apiUpdateEvent(mut.calendarId, mut.eventId, mut.payload as UpdateEventPatch)
        await applyCachedEvent(mut.calendarId, updated)
      } else if (mut.type === 'delete' && mut.eventId) {
        await apiDeleteEvent(mut.calendarId, mut.eventId)
        await removeCachedEvent(mut.calendarId, mut.eventId)
      }
      if (mut.id != null) await removePendingMutation(mut.id)
    } catch {
      // Keep in queue for next flush
    }
  }
  notifyListeners()
}

export async function syncNow(): Promise<void> {
  const calendars = await getCachedCalendarList()
  const calendarIds = calendars?.map((c) => c.id) ?? []
  if (calendarIds.length > 0) {
    await runIncrementalSync(calendarIds)
  }
  await flushPendingMutations()
  if (calendarIds.length > 0) {
    await runIncrementalSync(calendarIds)
  }
}

/** Create event: online → API + cache; offline → queue + optimistic cache (temp id). */
export async function createEventWithSync(
  calendarId: string,
  event: NewEventInput
): Promise<CalendarEvent | null> {
  if (getIsOnline()) {
    try {
      const created = await apiCreateEvent(calendarId, event)
      await applyCachedEvent(calendarId, created)
      state.cacheTimestamp = new Date()
      notifyListeners()
      return created
    } catch (err) {
      state.lastError = err instanceof Error ? err.message : 'Create failed'
      state.status = 'error'
      notifyListeners()
      return null
    }
  }
  const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`
  await addPendingMutation({
    type: 'create',
    calendarId,
    eventId: null,
    tempEventId: tempId,
    payload: event,
  })
  const optimistic: CalendarEvent = {
    id: tempId,
    summary: event.summary,
    start: event.start,
    end: event.end,
    calendarId,
  }
  await applyCachedEvent(calendarId, optimistic)
  notifyListeners()
  return optimistic
}

/** Update event: online → API + cache; offline → queue + optimistic cache. */
export async function updateEventWithSync(
  calendarId: string,
  eventId: string,
  patch: UpdateEventPatch
): Promise<CalendarEvent | null> {
  if (getIsOnline()) {
    try {
      const updated = await apiUpdateEvent(calendarId, eventId, patch)
      await applyCachedEvent(calendarId, updated)
      state.cacheTimestamp = new Date()
      notifyListeners()
      return updated
    } catch (err) {
      state.lastError = err instanceof Error ? err.message : 'Update failed'
      state.status = 'error'
      notifyListeners()
      return null
    }
  }
  await addPendingMutation({ type: 'update', calendarId, eventId, payload: patch })
  notifyListeners()
  return null
}

/** Delete event: online → API + remove from cache; offline → queue + remove from cache. */
export async function deleteEventWithSync(calendarId: string, eventId: string): Promise<boolean> {
  if (getIsOnline()) {
    try {
      await apiDeleteEvent(calendarId, eventId)
      await removeCachedEvent(calendarId, eventId)
      state.cacheTimestamp = new Date()
      notifyListeners()
      return true
    } catch (err) {
      state.lastError = err instanceof Error ? err.message : 'Delete failed'
      state.status = 'error'
      notifyListeners()
      return false
    }
  }
  await addPendingMutation({ type: 'delete', calendarId, eventId, payload: {} })
  await removeCachedEvent(calendarId, eventId)
  notifyListeners()
  return true
}

/** Start background sync (every 5 min) and listen for online/offline. */
export function startSyncService(): () => void {
  function onOnline(): void {
    state.status = 'syncing'
    notifyListeners()
    syncNow().catch(() => {})
  }
  function onOffline(): void {
    state.status = 'offline'
    notifyListeners()
  }

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  if (getIsOnline()) {
    state.syncIntervalId = setInterval(() => {
      backgroundSync().catch(() => {})
    }, SYNC_INTERVAL_MS)
    backgroundSync().catch(() => {})
  } else {
    state.status = 'offline'
    notifyListeners()
  }

  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    if (state.syncIntervalId) {
      clearInterval(state.syncIntervalId)
      state.syncIntervalId = null
    }
  }
}

export function isOnline(): boolean {
  return getIsOnline()
}
