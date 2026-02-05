import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { Check, Loader2 } from 'lucide-react';
import type { CalendarEvent as ServiceCalendarEvent } from '@/services/calendarService';
import { updateEventWithSync } from '@/services/syncService';
import type { UpdateEventPatch } from '@/store/calendarStore';

type EditModalPhase = 'edit' | 'saving' | 'success';

export interface EditEventModalProps {
  event: ServiceCalendarEvent | null;
  onClose: () => void;
  onSaved: () => void;
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

export default function EditEventModal({ event, onClose, onSaved }: EditEventModalProps) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [phase, setPhase] = useState<EditModalPhase>('edit');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setTitle(event.summary || '');
      const start = event.start?.dateTime ?? event.start?.date ?? '';
      const end = event.end?.dateTime ?? event.end?.date ?? start;
      setStartDate(toDateOnly(start));
      setStartTime(event.start?.date ? '' : toTimeOnly(start));
      setEndTime(event.end?.date ? '' : toTimeOnly(end));
      setError(null);
      setPhase('edit');
    }
  }, [event]);

  const handleSave = useCallback(async () => {
    if (!event) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Please enter a title.');
      return;
    }
    setError(null);
    setPhase('saving');
    try {
      const allDay = !startTime && !endTime;
      const patch: UpdateEventPatch = {
        summary: trimmed,
        ...(allDay
          ? {
              start: { date: startDate },
              end: { date: startDate },
            }
          : {
              start: { dateTime: `${startDate}T${startTime || '09:00'}:00` },
              end: { dateTime: `${startDate}T${endTime || startTime || '10:00'}:00` },
            }),
      };
      await updateEventWithSync(event.calendarId, event.id, patch);
      onSaved();
      setPhase('success');
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event');
      setPhase('edit');
    }
  }, [event, title, startDate, startTime, endTime, onSaved, onClose]);

  if (!event) return null;

  const allDay = !startTime && !endTime;
  const saving = phase === 'saving';
  const success = phase === 'success';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      >
        <div
          className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
          aria-hidden
          onClick={phase === 'edit' ? onClose : undefined}
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Edit event"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white dark:bg-neutral-dark-800 shadow-modal border border-neutral-200 dark:border-neutral-dark-600 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 pb-8">
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-8 gap-4"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                </div>
                <p className="font-display text-heading-md font-semibold text-neutral-900 dark:text-neutral-dark-50">
                  Saved!
                </p>
                <p className="text-body-sm text-neutral-600 dark:text-neutral-dark-400">
                  Closing…
                </p>
              </motion.div>
            ) : (
              <>
            <h2 className="font-display text-heading-md font-semibold text-neutral-900 dark:text-neutral-dark-50 mb-4">
              Edit event
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-title" className="block text-body-sm font-medium text-neutral-700 dark:text-neutral-dark-300 mb-1">
                  Title
                </label>
                <input
                  id="edit-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-900 text-neutral-900 dark:text-neutral-dark-50 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  disabled={saving}
                />
              </div>
              <div>
                <label htmlFor="edit-date" className="block text-body-sm font-medium text-neutral-700 dark:text-neutral-dark-300 mb-1">
                  Date
                </label>
                <input
                  id="edit-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-900 text-neutral-900 dark:text-neutral-dark-50 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  disabled={saving}
                />
              </div>
              {!allDay && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label htmlFor="edit-start" className="block text-body-sm font-medium text-neutral-700 dark:text-neutral-dark-300 mb-1">
                      Start
                    </label>
                    <input
                      id="edit-start"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-900 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                      disabled={saving}
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="edit-end" className="block text-body-sm font-medium text-neutral-700 dark:text-neutral-dark-300 mb-1">
                      End
                    </label>
                    <input
                      id="edit-end"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-900 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                      disabled={saving}
                    />
                  </div>
                </div>
              )}
            </div>
            {error && (
              <p className="mt-3 text-body-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
            <div className="mt-6 flex gap-3">
              <motion.button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 min-h-[52px] rounded-xl font-semibold text-white bg-accent-primary hover:bg-accent-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                whileTap={{ scale: 0.98 }}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save'
                )}
              </motion.button>
              <motion.button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 min-h-[52px] rounded-xl font-semibold text-neutral-700 dark:text-neutral-dark-300 bg-neutral-100 dark:bg-neutral-dark-700 hover:bg-neutral-200 dark:hover:bg-neutral-dark-600 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
            </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
