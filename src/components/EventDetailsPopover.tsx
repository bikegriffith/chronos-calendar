import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { Pencil, Trash2, Share2, MapPin, FileText } from 'lucide-react';
import type { CalendarEvent as ServiceCalendarEvent } from '@/services/calendarService';
import { updateEventWithSync } from '@/services/syncService';
import type { UpdateEventPatch } from '@/store/calendarStore';

export interface EventDetailsPopoverProps {
  event: ServiceCalendarEvent | null;
  anchorRect: { top: number; left: number; width: number; height: number } | null;
  onClose: () => void;
  /** Family member / calendar display name */
  calendarName?: string;
  onEdit?: (event: ServiceCalendarEvent) => void;
  onDelete?: (event: ServiceCalendarEvent) => void;
  onSaved?: () => void;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isDesktop;
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

function getEventDuration(ev: ServiceCalendarEvent): string | null {
  if (ev.start?.date) return 'All day';
  const start = ev.start?.dateTime ?? '';
  const end = ev.end?.dateTime ?? ev.end?.date ?? '';
  if (!start || !end) return null;
  try {
    const s = parseISO(start).getTime();
    const e = parseISO(end).getTime();
    const mins = Math.round((e - s) / 60000);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  } catch {
    return null;
  }
}

function toDateOnly(iso: string): string {
  try {
    const d = iso.includes('T') ? parseISO(iso) : parseISO(iso + 'T00:00:00');
    return format(d, 'yyyy-MM-dd');
  } catch {
    return iso.slice(0, 10) || '';
  }
}

function toTimeOnly(iso: string): string {
  if (!iso || !iso.includes('T')) return '';
  try {
    return format(parseISO(iso), 'HH:mm');
  } catch {
    return '';
  }
}

export default function EventDetailsPopover({
  event,
  anchorRect,
  onClose,
  calendarName = '',
  onEdit,
  onDelete,
  onSaved,
}: EventDetailsPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetEditState = useCallback((ev: ServiceCalendarEvent) => {
    setEditTitle(ev.summary || '');
    const start = ev.start?.dateTime ?? ev.start?.date ?? '';
    const end = ev.end?.dateTime ?? ev.end?.date ?? start;
    setEditStartDate(toDateOnly(start));
    setEditStartTime(ev.start?.date ? '' : toTimeOnly(start));
    setEditEndTime(ev.end?.date ? '' : toTimeOnly(end));
    setEditDescription(ev.description ?? '');
    setEditLocation(ev.location ?? '');
    setError(null);
  }, []);

  useEffect(() => {
    if (event) {
      resetEditState(event);
      setIsEditing(false);
    }
  }, [event, resetEditState]);

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

  const handleSave = useCallback(async () => {
    if (!event) return;
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setError('Please enter a title.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const allDay = !editStartTime && !editEndTime;
      const patch: UpdateEventPatch = {
        summary: trimmed,
        ...(editDescription.trim() ? { description: editDescription.trim() } : {}),
        ...(editLocation.trim() ? { location: editLocation.trim() } : {}),
        ...(allDay
          ? {
              start: { date: editStartDate },
              end: { date: editStartDate },
            }
          : {
              start: { dateTime: `${editStartDate}T${editStartTime || '09:00'}:00` },
              end: { dateTime: `${editStartDate}T${editEndTime || editStartTime || '10:00'}:00` },
            }),
      };
      await updateEventWithSync(event.calendarId, event.id, patch);
      onSaved?.();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event');
    } finally {
      setSaving(false);
    }
  }, [event, editTitle, editStartDate, editStartTime, editEndTime, editDescription, editLocation, onSaved]);

  const handleShare = useCallback(() => {
    if (!event) return;
    const lines = [
      event.summary || '(No title)',
      formatEventDate(event),
      formatEventTime(event),
      ...(event.location ? [event.location] : []),
      ...(event.description ? [event.description] : []),
    ];
    const text = lines.join('\n');
    void navigator.clipboard.writeText(text).then(() => {
      // Optional: show a brief "Copied!" toast
    });
  }, [event]);

  const handleEditClick = useCallback(() => {
    if (onEdit && event) {
      onEdit(event);
      onClose();
    } else {
      setIsEditing(true);
    }
  }, [onEdit, event, onClose]);

  const handleDeleteClick = useCallback(() => {
    if (onDelete && event) {
      onDelete(event);
      onClose();
    }
  }, [onDelete, event, onClose]);

  if (!event) return null;

  const eventColor = event.color ?? '#94a3b8';
  const duration = getEventDuration(event);

  const sheetVariants = {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
  };
  const popoverVariants = {
    initial: { opacity: 0, scale: 0.96, y: 4 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 4 },
  };
  const transition = { type: 'spring' as const, damping: 28, stiffness: 300 };

  return (
    <AnimatePresence>
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-40 bg-neutral-900/30 backdrop-blur-md"
          aria-hidden
          onClick={onClose}
        />
        <motion.div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label="Event details"
          initial={isDesktop ? popoverVariants.initial : sheetVariants.initial}
          animate={isDesktop ? popoverVariants.animate : sheetVariants.animate}
          exit={isDesktop ? popoverVariants.exit : sheetVariants.exit}
          transition={transition}
          className={`
            fixed z-50 overflow-hidden
            left-0 right-0 max-h-[85vh] flex flex-col
            sm:left-auto sm:right-auto sm:max-w-md sm:min-w-[320px] sm:max-h-[90vh] sm:rounded-2xl
            rounded-t-2xl
            bg-white/95 dark:bg-neutral-dark-800/95 backdrop-blur-xl
            shadow-modal dark:shadow-dark-modal
            border border-neutral-200/80 dark:border-neutral-dark-600
          `}
          style={
            isDesktop && anchorRect
              ? {
                  top: Math.min(anchorRect.top + anchorRect.height + 8, window.innerHeight - 280),
                  left: Math.max(16, Math.min(anchorRect.left, window.innerWidth - 336)),
                }
              : isDesktop
                ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
                : { bottom: 0 }
          }
        >
          {/* Color bar */}
          <div
            className="absolute top-0 left-0 w-1 sm:w-2 h-full opacity-90"
            style={{ backgroundColor: eventColor }}
          />

          <div className="overflow-y-auto overscroll-contain flex-1 min-h-0 pl-4 sm:pl-5">
            {isEditing ? (
              <div className="py-4 pr-4 space-y-4">
                <h2 className="font-display text-heading-sm font-semibold text-neutral-900 dark:text-neutral-dark-50 pr-6">
                  Edit event
                </h2>
                <div>
                  <label className="block text-caption font-medium text-neutral-600 dark:text-neutral-dark-400 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-900 text-neutral-900 dark:text-neutral-dark-50 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    placeholder="Event title"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-caption font-medium text-neutral-600 dark:text-neutral-dark-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-900 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    disabled={saving}
                  />
                </div>
                {editStartTime !== '' || editEndTime !== '' ? (
                  null
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditStartTime('09:00');
                      setEditEndTime('10:00');
                    }}
                    className="text-body-sm text-accent-primary font-medium hover:underline"
                  >
                    Add time
                  </button>
                )}
                {(editStartTime !== '' || editEndTime !== '') ? (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-caption font-medium text-neutral-600 dark:text-neutral-dark-400 mb-1">
                        Start
                      </label>
                      <input
                        type="time"
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-900 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        disabled={saving}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-caption font-medium text-neutral-600 dark:text-neutral-dark-400 mb-1">
                        End
                      </label>
                      <input
                        type="time"
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-900 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        disabled={saving}
                      />
                    </div>
                  </div>
                ) : null}
                <div>
                  <label className="block text-caption font-medium text-neutral-600 dark:text-neutral-dark-400 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-900 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    placeholder="Add location"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-caption font-medium text-neutral-600 dark:text-neutral-dark-400 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-900 focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
                    placeholder="Add description"
                    disabled={saving}
                  />
                </div>
                {error && (
                  <p className="text-body-sm text-red-600 dark:text-red-400" role="alert">
                    {error}
                  </p>
                )}
                <div className="flex gap-3 pt-2">
                  <motion.button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 min-h-[48px] rounded-xl font-semibold text-white bg-accent-primary hover:bg-accent-primary/90 disabled:opacity-60 transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                    className="flex-1 min-h-[48px] rounded-xl font-semibold text-neutral-700 dark:text-neutral-dark-300 bg-neutral-100 dark:bg-neutral-dark-700 hover:bg-neutral-200 dark:hover:bg-neutral-dark-600 transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            ) : (
              <>
                <div className="py-4 pr-6">
                  <h3 className="font-display text-heading-lg font-bold text-neutral-900 dark:text-neutral-dark-50 leading-tight pr-2">
                    {event.summary || '(No title)'}
                  </h3>
                  {calendarName && (
                    <div className="flex items-center gap-2 mt-3">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: eventColor }}
                      />
                      <span className="text-body-sm font-medium text-neutral-700 dark:text-neutral-dark-300">
                        {calendarName}
                      </span>
                    </div>
                  )}
                  <p className="text-body-sm text-neutral-600 dark:text-neutral-dark-400 mt-2">
                    {formatEventDate(event)}
                  </p>
                  <p className="text-body-sm text-neutral-600 dark:text-neutral-dark-400 mt-0.5">
                    {formatEventTime(event)}
                  </p>
                  {duration && (
                    <p className="text-caption text-neutral-500 dark:text-neutral-dark-500 mt-1">
                      {duration}
                    </p>
                  )}
                  {event.location?.trim() && (
                    <div className="flex items-start gap-2 mt-3 text-body-sm text-neutral-600 dark:text-neutral-dark-400">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-neutral-500" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.description?.trim() && (
                    <div className="flex items-start gap-2 mt-3 text-body-sm text-neutral-600 dark:text-neutral-dark-400">
                      <FileText className="w-4 h-4 shrink-0 mt-0.5 text-neutral-500" />
                      <p className="whitespace-pre-wrap break-words">{event.description}</p>
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <div className="flex items-center justify-center gap-2 py-4 px-4 border-t border-neutral-100 dark:border-neutral-dark-700">
                  <motion.button
                    type="button"
                    onClick={handleEditClick}
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-dark-700 text-neutral-700 dark:text-neutral-dark-300 hover:bg-neutral-200 dark:hover:bg-neutral-dark-600 transition-colors"
                    whileTap={{ scale: 0.92 }}
                    aria-label="Edit event"
                  >
                    <Pencil className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-dark-700 text-neutral-700 dark:text-neutral-dark-300 hover:bg-neutral-200 dark:hover:bg-neutral-dark-600 transition-colors"
                    whileTap={{ scale: 0.92 }}
                    aria-label="Copy to clipboard"
                  >
                    <Share2 className="w-5 h-5" />
                  </motion.button>
                  {onDelete && (
                    <motion.button
                      type="button"
                      onClick={handleDeleteClick}
                      className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                      whileTap={{ scale: 0.92 }}
                      aria-label="Delete event"
                    >
                      <Trash2 className="w-5 h-5" />
                    </motion.button>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
