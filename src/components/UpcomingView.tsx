import React, { useRef, useCallback, useMemo } from 'react';
import { format, addDays, parseISO, startOfDay, endOfDay } from 'date-fns';
import type { CalendarEvent as ServiceCalendarEvent } from '@/services/calendarService';

const LONG_PRESS_MS = 500;
const TITLE_MAX_CHARS = 36;

export interface UpcomingViewProps {
  events: ServiceCalendarEvent[];
  calendarColors: Record<string, string>;
  calendarNames?: Record<string, string>;
  /** Calendar ID → emoji avatar from family member config (optional; falls back to initial) */
  calendarAvatars?: Record<string, string>;
  /** First day of the 4-day window (today) */
  currentDate: Date;
  onEventClick?: (event: ServiceCalendarEvent, anchorEl?: HTMLElement) => void;
  onEventLongPress?: (event: ServiceCalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

function getInitial(name: string): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0]! + parts[1]![0]).toUpperCase();
  return name.trim()[0]!.toUpperCase();
}

/** Normalize to YYYY-MM-DD for reliable string comparison (handles 2025-2-5 vs 2025-02-05) */
function toYYYYMMDD(s: string): string {
  const parts = s.trim().split(/[-/]/);
  if (parts.length < 3) return s;
  const [y, m, d] = parts;
  return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
}

function eventOverlapsDay(ev: ServiceCalendarEvent, day: Date): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  const allDay = Boolean(ev.start?.date);
  if (allDay) {
    const startStr = (ev.start?.date ?? '').trim();
    const endStr = (ev.end?.date ?? startStr).trim();
    if (!startStr) return false;
    const dayStr = format(day, 'yyyy-MM-dd');
    const startNorm = toYYYYMMDD(startStr);
    const endNorm = endStr ? toYYYYMMDD(endStr) : startNorm;
    if (endNorm <= startNorm) return dayStr === startNorm;
    return dayStr >= startNorm && dayStr < endNorm;
  }
  const startStr = ev.start?.dateTime ?? '';
  const endStr = ev.end?.dateTime ?? startStr;
  if (!startStr) return false;
  try {
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    return start.getTime() < dayEnd.getTime() && end.getTime() > dayStart.getTime();
  } catch {
    return false;
  }
}

function formatEventTime(ev: ServiceCalendarEvent): string {
  if (ev.start?.date) return '';
  const dt = ev.start?.dateTime;
  if (!dt) return '';
  try {
    return format(parseISO(dt), 'h:mm a');
  } catch {
    return '';
  }
}

function sortEventsForDay(events: ServiceCalendarEvent[]): ServiceCalendarEvent[] {
  return [...events].sort((a, b) => {
    const aAllDay = Boolean(a.start?.date);
    const bAllDay = Boolean(b.start?.date);
    if (aAllDay && !bAllDay) return -1;
    if (!aAllDay && bAllDay) return 1;
    if (aAllDay && bAllDay) return 0;
    const aStart = a.start?.dateTime ?? '';
    const bStart = b.start?.dateTime ?? '';
    return aStart.localeCompare(bStart);
  });
}

export default function UpcomingView({
  events,
  calendarColors,
  calendarNames,
  calendarAvatars,
  currentDate,
  onEventClick,
  onEventLongPress,
  onDateClick,
}: UpcomingViewProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const days = useMemo(() => {
    return [0, 1, 2, 3].map((i) => addDays(currentDate, i));
  }, [currentDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map<number, ServiceCalendarEvent[]>();
    days.forEach((day, i) => {
      const dayEvents = events.filter((ev) => eventOverlapsDay(ev, day));
      map.set(i, sortEventsForDay(dayEvents));
    });
    return map;
  }, [events, days]);

  const handleEventClick = useCallback(
    (ev: ServiceCalendarEvent, e: React.MouseEvent | React.TouchEvent) => {
      if (longPressFired.current) return;
      const el = e.currentTarget as HTMLElement;
      onEventClick?.(ev, el);
    },
    [onEventClick]
  );

  const handleEventTouchStart = useCallback(
    (ev: ServiceCalendarEvent) => {
      longPressFired.current = false;
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null;
        longPressFired.current = true;
        onEventLongPress?.(ev);
      }, LONG_PRESS_MS);
    },
    [onEventLongPress]
  );

  const handleEventTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleEventTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const defaultColor = '#94a3b8';

  return (
    <div className="chronos-upcoming-view chronos-glass-card h-full min-h-0 rounded-2xl overflow-hidden flex flex-col">
      {/* Header row: day of week + date for each of 4 days */}
      <div className="grid grid-cols-4 gap-3 px-3 pt-4 pb-3 border-b border-[var(--chronos-grid-line)] shrink-0">
        {days.map((day) => (
          <div key={day.toISOString()} className="text-center min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--chronos-text-muted)]">
              {format(day, 'EEEE')}
            </div>
            <div className="text-sm font-medium text-[var(--chronos-text)] mt-0.5">
              {format(day, 'MMM d, yyyy')}
            </div>
          </div>
        ))}
      </div>

      {/* 4 columns of stacked events */}
      <div className="grid grid-cols-4 gap-3 flex-1 min-h-0 p-3 overflow-auto">
        {days.map((day, colIndex) => {
          const dayEvents = eventsByDay.get(colIndex) ?? [];
          return (
            <div
              key={day.toISOString()}
              className="flex flex-col gap-3 min-h-0 overflow-auto rounded-xl bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/10"
              role="button"
              tabIndex={0}
              onClick={() => onDateClick?.(day)}
              onKeyDown={(e) => e.key === 'Enter' && onDateClick?.(day)}
              aria-label={`Add event for ${format(day, 'EEEE, MMM d')}`}
            >
              <div className="p-3 flex flex-col gap-3 min-h-[120px]">
                {dayEvents.map((ev) => {
                  const color = ev.color ?? calendarColors[ev.calendarId] ?? defaultColor;
                  const memberName = calendarNames?.[ev.calendarId] ?? ev.calendarId.slice(0, 8);
                  const avatarEmoji = calendarAvatars?.[ev.calendarId];
                  const initial = getInitial(memberName);
                  const title = (ev.summary || '(No title)').length > TITLE_MAX_CHARS
                    ? (ev.summary || '(No title)').slice(0, TITLE_MAX_CHARS - 1).trim() + '…'
                    : (ev.summary || '(No title)');
                  const timeStr = formatEventTime(ev);
                  const isAllDay = Boolean(ev.start?.date);

                  return (
                    <button
                      key={ev.id}
                      type="button"
                      className="chronos-upcoming-event text-left w-full rounded-xl min-h-[68px] py-4 px-4 border-none cursor-pointer transition-all duration-200 flex items-start gap-3 shadow-sm hover:shadow-md active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--chronos-accent)]"
                      style={{
                        backgroundColor: `${color}22`,
                        borderLeft: `4px solid ${color}`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(ev, e);
                      }}
                      onTouchStart={() => handleEventTouchStart(ev)}
                      onTouchMove={handleEventTouchMove}
                      onTouchEnd={handleEventTouchEnd}
                      onTouchCancel={handleEventTouchEnd}
                    >
                      <span
                        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white font-bold leading-none ${avatarEmoji ? 'text-base' : 'text-xs'}`}
                        style={{ backgroundColor: color }}
                      >
                        {avatarEmoji ?? initial}
                      </span>
                      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                        {!isAllDay && timeStr && (
                          <span className="text-xs font-medium text-[var(--chronos-text-muted)]">{timeStr}</span>
                        )}
                        <span className="text-sm font-medium text-[var(--chronos-text)] leading-snug break-words line-clamp-2">
                          {title}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
