import { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import type { CalendarEvent as ServiceCalendarEvent } from '@/services/calendarService';

export interface EventDetailsPopoverProps {
  event: ServiceCalendarEvent | null;
  anchorRect: { top: number; left: number; width: number; height: number } | null;
  onClose: () => void;
  calendarName?: string;
}

function formatEventTime(ev: ServiceCalendarEvent): string {
  if (ev.start?.date) return 'All day';
  const start = ev.start?.dateTime ?? '';
  const end = ev.end?.dateTime ?? ev.end?.date ?? '';
  if (!start) return '';
  try {
    const startStr = format(parseISO(start), 'h:mm a');
    const endStr = end ? format(parseISO(end), 'h:mm a') : '';
    return endStr ? `${startStr} – ${endStr}` : startStr;
  } catch {
    return start;
  }
}

function formatEventDate(ev: ServiceCalendarEvent): string {
  const raw = ev.start?.dateTime ?? ev.start?.date ?? '';
  if (!raw) return '';
  try {
    const d = raw.includes('T') ? parseISO(raw) : parseISO(raw + 'T00:00:00');
    return format(d, 'EEEE, MMM d, yyyy');
  } catch {
    return raw;
  }
}

export default function EventDetailsPopover({
  event,
  anchorRect,
  onClose,
  calendarName = '',
}: EventDetailsPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!event) return;
    const t = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('touchstart', handleClickOutside, { passive: true, capture: true });
    });
    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, [event, handleClickOutside]);

  return (
    <AnimatePresence>
      {event && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={onClose}
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label="Event details"
            initial={{ opacity: 0, scale: 0.96, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed z-50 left-4 right-4 sm:left-auto sm:right-auto sm:min-w-[280px] max-w-md rounded-2xl bg-white dark:bg-neutral-dark-800 shadow-modal dark:shadow-dark-modal border border-neutral-200 dark:border-neutral-dark-600 overflow-hidden"
            style={
              anchorRect
                ? {
                    top: Math.min(anchorRect.top + anchorRect.height + 8, window.innerHeight - 220),
                    left: Math.max(16, Math.min(anchorRect.left, window.innerWidth - 320)),
                  }
                : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
            }
          >
            <div
              className="absolute top-0 left-0 w-2 h-full opacity-90"
              style={{ backgroundColor: event.color ?? '#94a3b8' }}
            />
            <div className="p-4 pl-5">
              <h3 className="font-display text-heading-md font-semibold text-neutral-900 dark:text-neutral-dark-50 pr-8">
                {event.summary || '(No title)'}
              </h3>
              <p className="text-body-sm text-neutral-600 dark:text-neutral-dark-400 mt-1">
                {formatEventDate(event)}
              </p>
              <p className="text-body-sm text-neutral-600 dark:text-neutral-dark-400 mt-0.5">
                {formatEventTime(event)}
              </p>
              {calendarName && (
                <p className="text-body-sm text-neutral-500 dark:text-neutral-dark-500 mt-2">
                  {calendarName}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
