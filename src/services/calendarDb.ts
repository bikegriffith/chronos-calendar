/**
 * IndexedDB schema via Dexie for offline calendar cache.
 * - Cached events for ~3 months
 * - Last sync timestamp per calendar
 * - Queue of pending create/update/delete when offline
 */

import Dexie, { type Table } from 'dexie'
import type { CalendarEvent, CalendarAccount } from './calendarService'

export interface CachedEvent {
  id: string
  calendarId: string
  event: CalendarEvent
  /** ISO start (date or dateTime) for range queries and pruning */
  startIso: string
  /** ISO end for pruning */
  endIso: string
  cachedAt: number
}

export interface SyncMeta {
  calendarId: string
  lastSyncAt: string
}

export type PendingMutationType = 'create' | 'update' | 'delete'

export interface PendingMutation {
  id?: number
  type: PendingMutationType
  calendarId: string
  eventId: string | null
  /** For create: optional temp id used for optimistic cache entry so we can remove it when flushing */
  tempEventId?: string
  /** For create: NewEventInput; for update: patch; for delete: unused */
  payload: unknown
  createdAt: number
}

export interface CachedCalendarList {
  id: 0
  calendars: CalendarAccount[]
  cachedAt: number
}

export class ChronosDB extends Dexie {
  events!: Table<CachedEvent, [string, string]>
  syncMeta!: Table<SyncMeta, string>
  pendingMutations!: Table<PendingMutation, number>
  calendarList!: Table<CachedCalendarList, number>

  constructor() {
    super('ChronosCalendar')
    this.version(1).stores({
      // [calendarId, eventId] for composite key
      events: '[calendarId+id], calendarId, startIso, [calendarId+startIso]',
      syncMeta: 'calendarId',
      pendingMutations: '++id, createdAt',
      calendarList: 'id',
    })
  }
}

export const db = new ChronosDB()

const THREE_MONTHS_MS = 3 * 30 * 24 * 60 * 60 * 1000

function eventStartIso(ev: CalendarEvent): string {
  return ev.start.dateTime ?? ev.start.date ?? ''
}

function eventEndIso(ev: CalendarEvent): string {
  return ev.end.dateTime ?? ev.end.date ?? ''
}

export async function putCachedEvents(calendarId: string, events: CalendarEvent[]): Promise<void> {
  const now = Date.now()
  const toPut: CachedEvent[] = events.map((event) => ({
    id: event.id,
    calendarId,
    event,
    startIso: eventStartIso(event),
    endIso: eventEndIso(event),
    cachedAt: now,
  }))
  await db.transaction('rw', db.events, async () => {
    for (const e of toPut) {
      await db.events.put(e)
    }
  })
}

/** Get cached events that overlap [rangeStart, rangeEnd] (event.start <= rangeEnd && event.end >= rangeStart). */
export async function getCachedEventsInRange(
  calendarIds: string[],
  rangeStart: string,
  rangeEnd: string
): Promise<CalendarEvent[]> {
  const results: CalendarEvent[] = []
  for (const calendarId of calendarIds) {
    const list = await db.events
      .where('calendarId')
      .equals(calendarId)
      .filter((c) => c.startIso <= rangeEnd && c.endIso >= rangeStart)
      .toArray()
    results.push(...list.map((r) => r.event))
  }
  return results
}

/** Remove events outside a 3-month window from now (keep 1.5 months past, 1.5 months future). */
export async function pruneEventsOutsideWindow(): Promise<void> {
  const now = Date.now()
  const start = new Date(now - THREE_MONTHS_MS / 2).toISOString()
  const end = new Date(now + THREE_MONTHS_MS / 2).toISOString()
  await db.transaction('rw', db.events, async () => {
    const toDelete = await db.events
      .where('startIso')
      .below(start)
      .or('startIso')
      .above(end)
      .toArray()
    for (const e of toDelete) {
      await db.events.delete([e.calendarId, e.id])
    }
  })
}

export async function setSyncMeta(calendarId: string, lastSyncAt: string): Promise<void> {
  await db.syncMeta.put({ calendarId, lastSyncAt })
}

export async function getSyncMeta(calendarId: string): Promise<string | undefined> {
  const row = await db.syncMeta.get(calendarId)
  return row?.lastSyncAt
}

export async function getAllSyncMeta(): Promise<Map<string, string>> {
  const rows = await db.syncMeta.toArray()
  return new Map(rows.map((r) => [r.calendarId, r.lastSyncAt]))
}

export async function addPendingMutation(mutation: Omit<PendingMutation, 'id' | 'createdAt'>): Promise<void> {
  await db.pendingMutations.add({
    ...mutation,
    createdAt: Date.now(),
  })
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  return db.pendingMutations.orderBy('createdAt').toArray()
}

export async function removePendingMutation(id: number): Promise<void> {
  await db.pendingMutations.delete(id)
}

export async function applyCachedEvent(calendarId: string, event: CalendarEvent): Promise<void> {
  await db.events.put({
    id: event.id,
    calendarId,
    event,
    startIso: eventStartIso(event),
    endIso: eventEndIso(event),
    cachedAt: Date.now(),
  })
}

export async function removeCachedEvent(calendarId: string, eventId: string): Promise<void> {
  await db.events.delete([calendarId, eventId])
}

export async function setCachedCalendarList(calendars: CalendarAccount[]): Promise<void> {
  await db.calendarList.put({ id: 0, calendars, cachedAt: Date.now() })
}

export async function getCachedCalendarList(): Promise<CalendarAccount[] | null> {
  const row = await db.calendarList.get(0)
  return row?.calendars ?? null
}

export async function getCalendarListCachedAt(): Promise<number | null> {
  const row = await db.calendarList.get(0)
  return row?.cachedAt ?? null
}
