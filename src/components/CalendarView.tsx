import React, { useRef, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventContentArg, EventClickArg, EventApi, DayCellMountArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import type { CalendarEvent as ServiceCalendarEvent } from '@/services/calendarService';

const LONG_PRESS_MS = 500;
const TITLE_MAX_CHARS = 28;

export interface CalendarViewProps {
  /** Events from Google Calendar (calendarService format) */
  events: ServiceCalendarEvent[];
  /** Map calendarId -> hex color for event/family member */
  calendarColors: Record<string, string>;
  /** Map calendarId -> display name for avatar initial */
  calendarNames?: Record<string, string>;
  /** Current view type */
  viewType: 'month' | 'week' | 'day';
  /** Current date (for initial/controlled date) */
  currentDate: Date;
  /** Ref to attach to the calendar (for parent to call prev/next for swipe) */
  calendarRef: React.RefObject<FullCalendar | null>;
  /** When the visible date range changes */
  onDatesSet?: (start: Date) => void;
  /** Tap on event: show details; optional element for popover positioning */
  onEventClick?: (event: ServiceCalendarEvent, anchorEl?: HTMLElement) => void;
  /** Long-press on event: quick actions (edit/delete) */
  onEventLongPress?: (event: ServiceCalendarEvent) => void;
  /** Tap on empty date cell: quick add event for that day */
  onDateClick?: (date: Date) => void;
  /** Double-click on date cell: open add event for that day */
  onDateDoubleClick?: (date: Date) => void;
}

const VIEW_MAP = {
  month: 'dayGridMonth',
  week: 'timeGridWeek',
  day: 'timeGridDay',
} as const;

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function truncateTitle(title: string, max: number): string {
  if (title.length <= max) return title;
  return title.slice(0, max - 1).trim() + '…';
}

function getInitial(name: string): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0]! + parts[1]![0]).toUpperCase();
  return name.trim()[0]!.toUpperCase();
}

/** Convert calendarService events to FullCalendar EventInput */
function toFullCalendarEvents(
  events: ServiceCalendarEvent[],
  calendarColors: Record<string, string>,
  calendarNames?: Record<string, string>
): Array<{
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    calendarId: string;
    memberName: string;
    raw: ServiceCalendarEvent;
  };
}> {
  const defaultColor = '#94a3b8';
  return events.map((ev) => {
    const allDay = Boolean(ev.start?.date);
    const start = ev.start?.dateTime ?? ev.start?.date ?? '';
    const end = ev.end?.dateTime ?? ev.end?.date ?? start;
    const color = ev.color ?? calendarColors[ev.calendarId] ?? defaultColor;
    const memberName = calendarNames?.[ev.calendarId] ?? ev.calendarId.slice(0, 8);
    return {
      id: ev.id,
      title: ev.summary || '(No title)',
      start,
      end,
      allDay,
      backgroundColor: color,
      borderColor: color,
      extendedProps: {
        calendarId: ev.calendarId,
        memberName,
        raw: ev,
      },
    };
  });
}

function CalendarViewInner({
  events,
  calendarColors,
  calendarNames,
  viewType,
  currentDate,
  calendarRef,
  onDatesSet,
  onEventClick,
  onEventLongPress,
  onDateClick,
  onDateDoubleClick,
}: CalendarViewProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const fcEvents = useMemo(
    () => toFullCalendarEvents(events, calendarColors, calendarNames),
    [events, calendarColors, calendarNames]
  );

  const handleDatesSet = useCallback(
    (arg: { start: Date }) => {
      onDatesSet?.(arg.start);
    },
    [onDatesSet]
  );

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      arg.jsEvent.preventDefault();
      const raw = (arg.event.extendedProps as { raw?: ServiceCalendarEvent }).raw;
      if (raw && !longPressFired.current) onEventClick?.(raw, arg.el);
      longPressFired.current = false;
    },
    [onEventClick]
  );

  const handleDateClick = useCallback(
    (arg: DateClickArg) => {
      arg.jsEvent.preventDefault();
      onDateClick?.(arg.date);
    },
    [onDateClick]
  );

  const handleEventDidMount = useCallback(
    (arg: { el: HTMLElement; event: EventApi }) => {
      const el = arg.el;
      const raw = (arg.event.extendedProps as { raw?: ServiceCalendarEvent }).raw;
      if (!raw || !onEventLongPress) return;

      const startTouch = { x: 0, y: 0 };
      const clearTimer = () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      };

      const onTouchStart = (e: TouchEvent) => {
        longPressFired.current = false;
        startTouch.x = e.touches[0].clientX;
        startTouch.y = e.touches[0].clientY;
        clearTimer();
        longPressTimer.current = setTimeout(() => {
          longPressTimer.current = null;
          longPressFired.current = true;
          onEventLongPress(raw);
        }, LONG_PRESS_MS);
      };

      const onTouchMove = (e: TouchEvent) => {
        const dx = Math.abs(e.touches[0].clientX - startTouch.x);
        const dy = Math.abs(e.touches[0].clientY - startTouch.y);
        if (dx > 10 || dy > 10) clearTimer();
      };

      const onTouchEnd = () => clearTimer();

      el.addEventListener('touchstart', onTouchStart, { passive: true });
      el.addEventListener('touchmove', onTouchMove, { passive: true });
      el.addEventListener('touchend', onTouchEnd);
      el.addEventListener('touchcancel', onTouchEnd);

      el.dataset.chronosCleanup = '1';
      (el as any).__chronosCleanup = () => {
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend', onTouchEnd);
        el.removeEventListener('touchcancel', onTouchEnd);
      };
    },
    [onEventLongPress]
  );

  const handleEventWillUnmount = useCallback((arg: { el: HTMLElement }) => {
    const cleanup = (arg.el as any).__chronosCleanup as (() => void) | undefined;
    if (cleanup) cleanup();
  }, []);

  const handleDayCellDidMount = useCallback(
    (arg: DayCellMountArg) => {
      if (!onDateDoubleClick) return;
      const date = arg.date instanceof Date ? arg.date : new Date(arg.date as string | number);
      const handler = () => onDateDoubleClick(date);
      arg.el.addEventListener('dblclick', handler);
      (arg.el as HTMLElement & { __chronosDayDblclick?: () => void }).__chronosDayDblclick = handler;
    },
    [onDateDoubleClick]
  );

  const handleDayCellWillUnmount = useCallback((arg: DayCellMountArg) => {
    const handler = (arg.el as HTMLElement & { __chronosDayDblclick?: () => void }).__chronosDayDblclick;
    if (handler) {
      arg.el.removeEventListener('dblclick', handler);
      delete (arg.el as HTMLElement & { __chronosDayDblclick?: () => void }).__chronosDayDblclick;
    }
  }, []);

  const renderEventContent = useCallback((arg: EventContentArg) => {
    const ext = arg.event.extendedProps as {
      memberName?: string;
      raw?: ServiceCalendarEvent;
    };
    const memberName = ext?.memberName ?? '';
    const initial = getInitial(memberName);
    const title = truncateTitle(arg.event.title ?? '', TITLE_MAX_CHARS);
    const isAllDay = arg.event.allDay;
    const timeText = arg.timeText ? `${escapeHtml(arg.timeText)} ` : '';
    const borderColor = arg.borderColor || arg.backgroundColor;

    const initialEl = `<span class="chronos-event-initial" style="background-color:${escapeHtml(borderColor)};color:#fff">${escapeHtml(initial)}</span>`;
    const timeEl = !isAllDay && timeText ? `<span class="chronos-event-time">${timeText}</span>` : '';
    const titleEl = `<span class="chronos-event-title">${escapeHtml(title)}</span>`;

    const html = `
      <div class="chronos-event-inner chronos-event-${isAllDay ? 'allday' : 'timed'}" style="--chronos-event-color:${escapeHtml(borderColor)}">
        ${initialEl}
        <span class="chronos-event-body">
          ${timeEl}
          ${titleEl}
        </span>
      </div>
    `;
    return { html };
  }, []);

  return (
    <div className="chronos-calendar-view chronos-glass-card h-full min-h-0 rounded-2xl overflow-hidden">
      <FullCalendar
        ref={calendarRef as React.RefObject<InstanceType<typeof FullCalendar>>}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={VIEW_MAP[viewType]}
        initialDate={currentDate}
        datesSet={handleDatesSet}
        headerToolbar={false}
        height="100%"
        firstDay={0}
        dayMaxEvents={4}
        dayMaxEventRows={4}
        moreLinkText={(num) => `${num} more`}
        moreLinkClick="popover"
        eventClick={handleEventClick}
        dateClick={onDateClick ? handleDateClick : undefined}
        eventDidMount={handleEventDidMount}
        eventWillUnmount={handleEventWillUnmount}
        dayCellDidMount={handleDayCellDidMount}
        dayCellWillUnmount={handleDayCellWillUnmount}
        eventContent={renderEventContent}
        events={fcEvents}
        fixedWeekCount={false}
        slotMinWidth={48}
        dayCellClassNames="chronos-day-cell chronos-day-cell-tappable"
        // @ts-expect-error FullCalendar supports contentClassNames; types may be incomplete
        contentClassNames="chronos-calendar-content"
        eventClassNames="chronos-fc-event"
      />
    </div>
  );
}

const CalendarView = React.memo(CalendarViewInner);
export default CalendarView;
