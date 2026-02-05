/**
 * Google Calendar API service.
 * Uses the REST API with the authenticated user's access token.
 * Handles pagination for large event lists and errors gracefully.
 */

import { getAccessToken } from './googleAuth';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DateRange {
  start: string; // ISO 8601
  end: string;   // ISO 8601
}

export interface CalendarAccount {
  id: string;
  summary: string;
  backgroundColor: string | null;
  accessRole: string;
}

export interface CalendarEventAttendee {
  email: string;
  displayName?: string;
  responseStatus?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: CalendarEventAttendee[];
  calendarId: string;
  color?: string;
}

// ---------------------------------------------------------------------------
// API response types (Google Calendar API v3)
// ---------------------------------------------------------------------------

interface CalendarListResponse {
  items?: Array<{
    id: string;
    summary?: string;
    backgroundColor?: string;
    accessRole?: string;
  }>;
  nextPageToken?: string;
}

interface EventsListResponse {
  items?: Array<{
    id: string;
    summary?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
    attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string }>;
  }>;
  nextPageToken?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated. Please sign in with Google.');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!res.ok) {
    const body = await res.text();
    let message = `Calendar API error: ${res.status} ${res.statusText}`;
    try {
      const json = JSON.parse(body);
      message = json.error?.message ?? message;
    } catch {
      if (body) message += ` - ${body}`;
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function mapCalendarListItem(
  item: NonNullable<CalendarListResponse['items']>[number]
): CalendarAccount {
  return {
    id: item.id,
    summary: item.summary ?? '',
    backgroundColor: item.backgroundColor ?? null,
    accessRole: item.accessRole ?? 'none',
  };
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
  }));
  return {
    id: raw.id,
    summary: raw.summary ?? '',
    start: raw.start ?? { date: '' },
    end: raw.end ?? { date: '' },
    attendees,
    calendarId,
    color,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches the calendar list for the authenticated user.
 */
export async function getCalendarList(): Promise<CalendarAccount[]> {
  try {
    const all: CalendarAccount[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams();
      if (pageToken) params.set('pageToken', pageToken);
      const query = params.toString();
      const url = `${CALENDAR_API_BASE}/users/me/calendarList${query ? `?${query}` : ''}`;
      const data = await apiRequest<CalendarListResponse>(url);
      const items = data.items ?? [];
      all.push(...items.map(mapCalendarListItem));
      pageToken = data.nextPageToken;
    } while (pageToken);

    return all;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Failed to fetch calendar list');
  }
}

/**
 * Fetches events from multiple calendars for a date range.
 * Handles pagination for large event lists per calendar.
 */
export async function getEvents(
  calendarIds: string[],
  dateRange: DateRange,
  calendarColors?: Map<string, string>
): Promise<CalendarEvent[]> {
  try {
    const allEvents: CalendarEvent[] = [];

    for (const calendarId of calendarIds) {
      const encodedId = encodeURIComponent(calendarId);
      let pageToken: string | undefined;
      const color = calendarColors?.get(calendarId);

      do {
        const params = new URLSearchParams({
          timeMin: dateRange.start,
          timeMax: dateRange.end,
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '250',
        });
        if (pageToken) params.set('pageToken', pageToken);
        const url = `${CALENDAR_API_BASE}/calendars/${encodedId}/events?${params}`;
        const data = await apiRequest<EventsListResponse>(url);
        const items = data.items ?? [];
        allEvents.push(...items.map((item) => mapEventItem(item, calendarId, color)));
        pageToken = data.nextPageToken;
      } while (pageToken);
    }

    return allEvents;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Failed to fetch events');
  }
}

/**
 * Creates a new event on the specified calendar.
 */
export async function createEvent(
  calendarId: string,
  event: {
    summary: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    description?: string;
    attendees?: Array<{ email: string }>;
  }
): Promise<CalendarEvent> {
  try {
    const encodedId = encodeURIComponent(calendarId);
    const url = `${CALENDAR_API_BASE}/calendars/${encodedId}/events`;
    const body = {
      summary: event.summary,
      start: event.start,
      end: event.end,
      ...(event.description && { description: event.description }),
      ...(event.attendees?.length && { attendees: event.attendees }),
    };
    const raw = await apiRequest<NonNullable<EventsListResponse['items']>[number] & { id: string }>(
      url,
      { method: 'POST', body: JSON.stringify(body) }
    );
    return mapEventItem(raw, calendarId);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Failed to create event');
  }
}

/**
 * Updates an existing event.
 */
export async function updateEvent(
  calendarId: string,
  eventId: string,
  patch: {
    summary?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
    description?: string;
    attendees?: Array<{ email: string }>;
  }
): Promise<CalendarEvent> {
  try {
    const encodedCalId = encodeURIComponent(calendarId);
    const encodedEventId = encodeURIComponent(eventId);
    const url = `${CALENDAR_API_BASE}/calendars/${encodedCalId}/events/${encodedEventId}`;
    const raw = await apiRequest<NonNullable<EventsListResponse['items']>[number] & { id: string }>(
      url,
      { method: 'PATCH', body: JSON.stringify(patch) }
    );
    return mapEventItem(raw, calendarId);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Failed to update event');
  }
}

/**
 * Deletes an event.
 */
export async function deleteEvent(
  calendarId: string,
  eventId: string
): Promise<void> {
  try {
    const encodedCalId = encodeURIComponent(calendarId);
    const encodedEventId = encodeURIComponent(eventId);
    const url = `${CALENDAR_API_BASE}/calendars/${encodedCalId}/events/${encodedEventId}`;
    await apiRequest<undefined>(url, { method: 'DELETE' });
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Failed to delete event');
  }
}
