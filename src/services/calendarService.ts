/**
 * Google Calendar API service.
 * Uses the REST API with the authenticated user's access token.
 */

import { getAccessToken } from './googleAuth'

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

export interface DateRange {
  start: string
  end: string
}

export interface CalendarAccount {
  id: string
  summary: string
  backgroundColor: string | null
  accessRole: string
}

export interface CalendarEventAttendee {
  email: string
  displayName?: string
  responseStatus?: string
}

export interface CalendarEvent {
  id: string
  summary: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  attendees?: CalendarEventAttendee[]
  calendarId: string
  color?: string
}

interface CalendarListResponse {
  items?: Array<{
    id: string
    summary?: string
    backgroundColor?: string
    accessRole?: string
  }>
  nextPageToken?: string
}

interface EventsListResponse {
  items?: Array<{
    id: string
    summary?: string
    start?: { dateTime?: string; date?: string }
    end?: { dateTime?: string; date?: string }
    attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string }>
  }>
  nextPageToken?: string
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken()
  if (!token) {
    throw new Error('Not authenticated. Please sign in with Google.')
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  })
  if (!res.ok) {
    const body = await res.text()
    let message = `Calendar API error: ${res.status} ${res.statusText}`
    try {
      const json = JSON.parse(body)
      message = json.error?.message ?? message
    } catch {
      if (body) message += ` - ${body}`
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function mapCalendarListItem(item: NonNullable<CalendarListResponse['items']>[number]): CalendarAccount {
  return {
    id: item.id,
    summary: item.summary ?? '',
    backgroundColor: item.backgroundColor ?? null,
    accessRole: item.accessRole ?? 'none',
  }
}

function mapEventItem(
  raw: NonNullable<EventsListResponse['items']>[number],
  calendarId: string,
  color?: string
): CalendarEvent {
  const attendees: CalendarEventAttendee[] = (raw.attendees ?? []).map((a) => ({
    email: a.email ?? '',
    displayName: a.displayName,
    responseStatus: a.responseStatus,
  }))
  return {
    id: raw.id,
    summary: raw.summary ?? '',
    start: raw.start ?? { date: '' },
    end: raw.end ?? { date: '' },
    attendees,
    calendarId,
    color,
  }
}

export async function getCalendarList(): Promise<CalendarAccount[]> {
  try {
    const all: CalendarAccount[] = []
    let pageToken: string | undefined
    do {
      const params = new URLSearchParams()
      if (pageToken) params.set('pageToken', pageToken)
      const query = params.toString()
      const url = `${CALENDAR_API_BASE}/users/me/calendarList${query ? `?${query}` : ''}`
      const data = await apiRequest<CalendarListResponse>(url)
      const items = data.items ?? []
      all.push(...items.map(mapCalendarListItem))
      pageToken = data.nextPageToken
    } while (pageToken)
    return all
  } catch (err) {
    if (err instanceof Error) throw err
    throw new Error('Failed to fetch calendar list')
  }
}

export interface GetEventsOptions {
  calendarColors?: Map<string, string>
  omitOrderBy?: boolean
  /** If set, only return events modified since this RFC3339 timestamp (for incremental sync). */
  updatedMin?: string
  /** When using updatedMin, set true to include deleted events so local cache can be updated. */
  showDeleted?: boolean
}

export async function getEvents(
  calendarIds: string[],
  dateRange: DateRange,
  options: GetEventsOptions = {}
): Promise<CalendarEvent[]> {
  const { calendarColors, omitOrderBy, updatedMin, showDeleted } = options
  try {
    const allEvents: CalendarEvent[] = []
    for (const calendarId of calendarIds) {
      const encodedId = encodeURIComponent(calendarId)
      let pageToken: string | undefined
      const color = calendarColors?.get(calendarId)
      do {
        const params = new URLSearchParams({
          timeMin: dateRange.start,
          timeMax: dateRange.end,
          singleEvents: 'true',
          maxResults: '250',
        })
        if (!omitOrderBy) params.set('orderBy', 'startTime')
        if (updatedMin) params.set('updatedMin', updatedMin)
        if (showDeleted) params.set('showDeleted', 'true')
        if (pageToken) params.set('pageToken', pageToken)
        const url = `${CALENDAR_API_BASE}/calendars/${encodedId}/events?${params}`
        const data = await apiRequest<EventsListResponse>(url)
        const items = data.items ?? []
        allEvents.push(...items.map((item) => mapEventItem(item, calendarId, color)))
        pageToken = data.nextPageToken
      } while (pageToken)
    }
    return allEvents
  } catch (err) {
    if (err instanceof Error) throw err
    throw new Error('Failed to fetch events')
  }
}

/** Browser's IANA time zone for interpreting local dateTime values. */
function getLocalTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
  } catch {
    return 'UTC'
  }
}

/** Ensure start/end have timeZone when dateTime is set (Google API requirement). */
function normalizeEventTimes<T extends { dateTime?: string; date?: string; timeZone?: string }>(
  start: T,
  end: T
): { start: T; end: T } {
  const tz = getLocalTimeZone()
  const withTz = <S extends { dateTime?: string; date?: string; timeZone?: string }>(s: S): S =>
    s.dateTime && !s.timeZone ? { ...s, timeZone: tz } as S : s
  return { start: withTz(start), end: withTz(end) }
}

export async function createEvent(
  calendarId: string,
  event: {
    summary: string
    start: { dateTime?: string; date?: string }
    end: { dateTime?: string; date?: string }
    description?: string
    attendees?: Array<{ email: string }>
  }
): Promise<CalendarEvent> {
  try {
    const encodedId = encodeURIComponent(calendarId)
    const url = `${CALENDAR_API_BASE}/calendars/${encodedId}/events`
    const { start, end } = normalizeEventTimes(event.start, event.end)
    const body = {
      summary: event.summary,
      start,
      end,
      ...(event.description && { description: event.description }),
      ...(event.attendees?.length && { attendees: event.attendees }),
    }
    const raw = await apiRequest<NonNullable<EventsListResponse['items']>[number] & { id: string }>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return mapEventItem(raw, calendarId)
  } catch (err) {
    if (err instanceof Error) throw err
    throw new Error('Failed to create event')
  }
}

export async function updateEvent(
  calendarId: string,
  eventId: string,
  patch: {
    summary?: string
    start?: { dateTime?: string; date?: string }
    end?: { dateTime?: string; date?: string }
    description?: string
    attendees?: Array<{ email: string }>
  }
): Promise<CalendarEvent> {
  try {
    const encodedCalId = encodeURIComponent(calendarId)
    const encodedEventId = encodeURIComponent(eventId)
    const url = `${CALENDAR_API_BASE}/calendars/${encodedCalId}/events/${encodedEventId}`
    let normalizedPatch = patch
    if (patch.start ?? patch.end) {
      const start = patch.start ?? {}
      const end = patch.end ?? {}
      const { start: nStart, end: nEnd } = normalizeEventTimes(start, end)
      normalizedPatch = { ...patch, start: nStart, end: nEnd }
    }
    const raw = await apiRequest<NonNullable<EventsListResponse['items']>[number] & { id: string }>(url, {
      method: 'PATCH',
      body: JSON.stringify(normalizedPatch),
    })
    return mapEventItem(raw, calendarId)
  } catch (err) {
    if (err instanceof Error) throw err
    throw new Error('Failed to update event')
  }
}

export async function deleteEvent(calendarId: string, eventId: string): Promise<void> {
  try {
    const encodedCalId = encodeURIComponent(calendarId)
    const encodedEventId = encodeURIComponent(eventId)
    const url = `${CALENDAR_API_BASE}/calendars/${encodedCalId}/events/${encodedEventId}`
    await apiRequest<undefined>(url, { method: 'DELETE' })
  } catch (err) {
    if (err instanceof Error) throw err
    throw new Error('Failed to delete event')
  }
}
