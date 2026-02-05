/**
 * Zustand store for calendar state: accounts, events, UI, and actions.
 * Uses calendarService for API calls with loading and error handling.
 */

import { create } from 'zustand';
import {
  getCalendarList,
  getEvents,
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  deleteEvent as apiDeleteEvent,
} from '@/services/calendarService'
import type {
  CalendarAccount,
  CalendarEvent,
  DateRange,
} from '@/services/calendarService'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ViewType = 'month' | 'week' | 'day';

export interface CalendarAccountsState {
  /** All connected calendars from Google */
  calendars: CalendarAccount[];
  /** Calendar IDs that are visible in the view (subset of calendars) */
  visibleCalendarIds: string[];
  /** Map calendarId -> family member id (which person "owns" this calendar) */
  calendarToFamilyMember: Record<string, string>;
  calendarsLoading: boolean;
  calendarsError: string | null;
}

export interface EventsState {
  /** Events keyed by calendar ID (all fetched events per calendar) */
  eventsByCalendarId: Record<string, CalendarEvent[]>;
  eventsLoading: boolean;
  eventsError: string | null;
}

export interface UIState {
  viewType: ViewType;
  selectedDate: Date;
  /** Family member id to filter by; null = show all */
  familyMemberFilter: string | null;
}

export interface CalendarState extends CalendarAccountsState, EventsState, UIState {}

// ---------------------------------------------------------------------------
// Selectors (derived state)
// ---------------------------------------------------------------------------

/** Map calendarId -> color (from account or default) for use in UI */
export function getCalendarColors(state: CalendarState): Record<string, string> {
  const colors: Record<string, string> = {};
  const defaults = ['#F08080', '#64B5F6', '#81C784', '#BA68C8', '#FFB74D'];
  state.calendars.forEach((cal, i) => {
    colors[cal.id] = cal.backgroundColor ?? defaults[i % defaults.length]!;
  });
  return colors;
}

/** Map calendarId -> display name */
export function getCalendarNames(state: CalendarState): Record<string, string> {
  const names: Record<string, string> = {};
  state.calendars.forEach((cal) => {
    names[cal.id] = cal.summary || cal.id;
  });
  return names;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface CalendarActions {
  fetchCalendars: () => Promise<void>;
  fetchEvents: (dateRange: DateRange) => Promise<void>;
  addEvent: (calendarId: string, event: NewEventInput) => Promise<CalendarEvent | null>;
  updateEvent: (calendarId: string, eventId: string, patch: UpdateEventPatch) => Promise<CalendarEvent | null>;
  deleteEvent: (calendarId: string, eventId: string) => Promise<boolean>;
  toggleCalendarVisibility: (calendarId: string) => void;
  setFamilyMemberFilter: (personId: string | null) => void;
  setViewType: (view: ViewType) => void;
  setSelectedDate: (date: Date) => void;
  setCalendarFamilyMember: (calendarId: string, personId: string | null) => void;
}

export interface NewEventInput {
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
  attendees?: Array<{ email: string }>;
}

export interface UpdateEventPatch {
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  description?: string;
  attendees?: Array<{ email: string }>;
}

export const useCalendarStore = create<CalendarState & CalendarActions>((set, get) => ({
  // Calendar accounts
  calendars: [],
  visibleCalendarIds: [],
  calendarToFamilyMember: {},
  calendarsLoading: false,
  calendarsError: null,

  // Events
  eventsByCalendarId: {},
  eventsLoading: false,
  eventsError: null,

  // UI
  viewType: 'month',
  selectedDate: new Date(),
  familyMemberFilter: null,

  fetchCalendars: async () => {
    set({ calendarsLoading: true, calendarsError: null });
    try {
      const calendars = await getCalendarList();
      const visibleCalendarIds = calendars.map((c) => c.id);
      set({
        calendars,
        visibleCalendarIds,
        calendarsLoading: false,
        calendarsError: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load calendars';
      set({ calendarsLoading: false, calendarsError: message });
    }
  },

  fetchEvents: async (dateRange: DateRange) => {
    const { calendars, visibleCalendarIds } = get();
    const calendarIds = visibleCalendarIds.length > 0 ? visibleCalendarIds : calendars.map((c) => c.id);
    if (calendarIds.length === 0) {
      set({ eventsByCalendarId: {}, eventsLoading: false, eventsError: null });
      return;
    }
    set((s) => ({ ...s, eventsLoading: true, eventsError: null }));
    try {
      const colors = getCalendarColors(get());
      const colorsMap = new Map<string, string>(Object.entries(colors));
      const events = await getEvents(calendarIds, dateRange, colorsMap);
      const eventsByCalendarId: Record<string, CalendarEvent[]> = {};
      for (const calId of calendarIds) {
        eventsByCalendarId[calId] = events.filter((e) => e.calendarId === calId);
      }
      set({ eventsByCalendarId, eventsLoading: false, eventsError: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load events';
      set({ eventsLoading: false, eventsError: message });
    }
  },

  addEvent: async (calendarId: string, event: NewEventInput) => {
    set((s) => ({ ...s, eventsError: null }));
    try {
      const created = await apiCreateEvent(calendarId, event);
      set((state) => {
        const byCal = { ...state.eventsByCalendarId };
        const list = byCal[calendarId] ?? [];
        byCal[calendarId] = [...list, created];
        return { eventsByCalendarId: byCal, eventsError: null };
      });
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create event';
      set({ eventsError: message });
      return null;
    }
  },

  updateEvent: async (calendarId: string, eventId: string, patch: UpdateEventPatch) => {
    set((s) => ({ ...s, eventsError: null }));
    try {
      const updated = await apiUpdateEvent(calendarId, eventId, patch);
      set((state) => {
        const byCal = { ...state.eventsByCalendarId };
        const list = byCal[calendarId] ?? [];
        const idx = list.findIndex((e) => e.id === eventId);
        if (idx === -1) return state;
        const next = [...list];
        next[idx] = updated;
        byCal[calendarId] = next;
        return { eventsByCalendarId: byCal, eventsError: null };
      });
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update event';
      set({ eventsError: message });
      return null;
    }
  },

  deleteEvent: async (calendarId: string, eventId: string) => {
    set((s) => ({ ...s, eventsError: null }));
    try {
      await apiDeleteEvent(calendarId, eventId);
      set((state) => {
        const byCal = { ...state.eventsByCalendarId };
        const list = byCal[calendarId] ?? [];
        byCal[calendarId] = list.filter((e) => e.id !== eventId);
        return { eventsByCalendarId: byCal, eventsError: null };
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete event';
      set({ eventsError: message });
      return false;
    }
  },

  toggleCalendarVisibility: (calendarId: string) => {
    set((state) => {
      const visible = state.visibleCalendarIds.includes(calendarId)
        ? state.visibleCalendarIds.filter((id) => id !== calendarId)
        : [...state.visibleCalendarIds, calendarId];
      return { visibleCalendarIds: visible };
    });
  },

  setFamilyMemberFilter: (personId: string | null) => {
    set({ familyMemberFilter: personId });
  },

  setViewType: (viewType: ViewType) => {
    set({ viewType });
  },

  setSelectedDate: (selectedDate: Date) => {
    set({ selectedDate });
  },

  setCalendarFamilyMember: (calendarId: string, personId: string | null) => {
    set((state) => {
      const next = { ...state.calendarToFamilyMember };
      if (personId === null) delete next[calendarId];
      else next[calendarId] = personId;
      return { calendarToFamilyMember: next };
    });
  },
}));

// ---------------------------------------------------------------------------
// Derived selectors (use in components)
// ---------------------------------------------------------------------------

/** Subscribe to filtered events (visible calendars + family member filter) */
export function useCalendarFilteredEvents(): CalendarEvent[] {
  return useCalendarStore((state) => {
    const { eventsByCalendarId, visibleCalendarIds, calendarToFamilyMember, familyMemberFilter } = state;
    const calendarIds = familyMemberFilter
      ? visibleCalendarIds.filter((id) => calendarToFamilyMember[id] === familyMemberFilter)
      : visibleCalendarIds;
    const events: CalendarEvent[] = [];
    for (const calId of calendarIds) {
      events.push(...(eventsByCalendarId[calId] ?? []));
    }
    return events;
  });
}

export function useCalendarVisibleIds(): string[] {
  return useCalendarStore((s) => s.visibleCalendarIds);
}

export function useCalendarsLoading(): boolean {
  return useCalendarStore((s) => s.calendarsLoading);
}

export function useCalendarsError(): string | null {
  return useCalendarStore((s) => s.calendarsError);
}

export function useEventsLoading(): boolean {
  return useCalendarStore((s) => s.eventsLoading);
}

export function useEventsError(): string | null {
  return useCalendarStore((s) => s.eventsError);
}
