import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, Calendar, Clock, User, FileText } from 'lucide-react';
import type { ParsedEvent } from '@/services/aiEventParser';
import { parsedEventToNewEventInput } from '@/services/aiEventParser';
import type { NewEventInput } from '@/store/calendarStore';
import type { FamilyMember } from '@shared/types';

export interface EventConfirmationModalProps {
  open: boolean;
  initialEvent: ParsedEvent;
  familyMembers: FamilyMember[];
  /** Resolve calendar id from selected family member id; fallback to first calendar if needed */
  getCalendarIdForMember: (memberId: string | null) => string | undefined;
  /** First calendar id to use when no member is selected */
  defaultCalendarId: string | undefined;
  onConfirm: (calendarId: string, event: NewEventInput) => Promise<void>;
  onCancel: () => void;
  onSuccess?: () => void;
}

type ModalPhase = 'edit' | 'loading' | 'success';

function resolveMemberIdFromAttendee(
  attendeeName: string | null,
  familyMembers: FamilyMember[]
): string | null {
  if (!attendeeName?.trim()) return null;
  const name = attendeeName.trim().toLowerCase();
  const found = familyMembers.find(
    (m) => m.name.toLowerCase() === name || m.name.toLowerCase().startsWith(name)
  );
  return found?.id ?? null;
}

export default function EventConfirmationModal({
  open,
  initialEvent,
  familyMembers,
  getCalendarIdForMember,
  defaultCalendarId,
  onConfirm,
  onCancel,
  onSuccess,
}: EventConfirmationModalProps) {
  const [title, setTitle] = useState(initialEvent.title);
  const [startDate, setStartDate] = useState(initialEvent.startDate);
  const [startTime, setStartTime] = useState(initialEvent.startTime ?? '');
  const [endTime, setEndTime] = useState(initialEvent.endTime ?? '');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>(
    initialEvent.durationMinutes ?? ''
  );
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(() =>
    resolveMemberIdFromAttendee(initialEvent.attendee, familyMembers)
  );
  const [notes, setNotes] = useState(initialEvent.notes ?? '');
  const [phase, setPhase] = useState<ModalPhase>('edit');
  const [error, setError] = useState<string | null>(null);

  // When modal opens with a new initialEvent, sync form state (useState only runs on first mount)
  useEffect(() => {
    if (open) {
      setTitle(initialEvent.title);
      setStartDate(initialEvent.startDate);
      setStartTime(initialEvent.startTime ?? '');
      setEndTime(initialEvent.endTime ?? '');
      setDurationMinutes(initialEvent.durationMinutes ?? '');
      setSelectedMemberId(resolveMemberIdFromAttendee(initialEvent.attendee, familyMembers));
      setNotes(initialEvent.notes ?? '');
      setPhase('edit');
      setError(null);
    }
  }, [open, initialEvent, familyMembers]);

  const isAllDay = !startTime && !endTime;
  const toggleAllDay = useCallback(() => {
    if (isAllDay) {
      setStartTime('09:00');
      setEndTime('10:00');
      setDurationMinutes(60);
    } else {
      setStartTime('');
      setEndTime('');
      setDurationMinutes('');
    }
  }, [isAllDay]);

  const parsedForSubmit = useMemo((): ParsedEvent => ({
    title: title.trim(),
    startDate,
    startTime: startTime || null,
    endTime: endTime || null,
    durationMinutes: typeof durationMinutes === 'number' ? durationMinutes : durationMinutes === '' ? null : durationMinutes,
    attendee: selectedMemberId ? familyMembers.find((m) => m.id === selectedMemberId)?.name ?? null : null,
    notes: notes.trim() || null,
  }), [title, startDate, startTime, endTime, durationMinutes, selectedMemberId, familyMembers, notes]);

  const validationError = useMemo(() => {
    if (!title.trim()) return 'Please enter a title.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return 'Please select a valid date.';
    if (!isAllDay) {
      if (startTime && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(startTime)) return 'Invalid start time.';
      if (endTime && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(endTime)) return 'Invalid end time.';
    }
    return null;
  }, [title, startDate, startTime, endTime, isAllDay]);

  const handleAddToCalendar = useCallback(async () => {
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setPhase('loading');
    const calendarId = getCalendarIdForMember(selectedMemberId) ?? defaultCalendarId;
    if (!calendarId) {
      setError('No calendar selected. Please assign a family member or add a calendar.');
      setPhase('edit');
      return;
    }
    try {
      const eventInput = parsedEventToNewEventInput(parsedForSubmit);
      await onConfirm(calendarId, eventInput);
      setPhase('success');
      onSuccess?.();
      setTimeout(() => onCancel(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add event');
      setPhase('edit');
    }
  }, [
    validationError,
    getCalendarIdForMember,
    selectedMemberId,
    defaultCalendarId,
    parsedForSubmit,
    onConfirm,
    onSuccess,
    onCancel,
  ]);

  const handleCancel = useCallback(() => {
    if (phase === 'loading') return;
    setError(null);
    onCancel();
  }, [phase, onCancel]);

  return (
    <AnimatePresence>
      {open && (
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
        initial={false}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCancel}
          aria-hidden
        />

        {/* Card — slide up */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-confirmation-title"
          className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white dark:bg-neutral-dark-800 shadow-modal dark:shadow-dark-modal border border-neutral-200/80 dark:border-neutral-dark-600 overflow-hidden"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle bar (mobile) */}
          <div className="sm:hidden flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-dark-600" />
          </div>

          <div className="p-5 sm:p-6 pb-8 max-h-[85vh] overflow-y-auto">
            {phase === 'success' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-8 gap-4"
              >
                <div className="w-14 h-14 rounded-full bg-accent-success/20 dark:bg-accent-success/30 flex items-center justify-center">
                  <Check className="w-8 h-8 text-accent-success-dark dark:text-accent-success-light" strokeWidth={2.5} />
                </div>
                <p className="font-display text-heading-md font-semibold text-neutral-900 dark:text-neutral-dark-50">
                  Event added!
                </p>
                <p className="text-body-sm text-neutral-600 dark:text-neutral-dark-400">
                  Closing…
                </p>
              </motion.div>
            ) : (
              <>
                <h2
                  id="event-confirmation-title"
                  className="font-display text-heading-md font-semibold text-neutral-900 dark:text-neutral-dark-50 mb-4"
                >
                  Add event
                </h2>

                {/* Card content */}
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label htmlFor="event-title" className="block text-body-sm font-medium text-neutral-700 dark:text-neutral-dark-300 mb-1">
                      Title
                    </label>
                    <input
                      id="event-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Event title"
                      className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-900 text-neutral-900 dark:text-neutral-dark-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-dark-500 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-body"
                      disabled={phase === 'loading'}
                      autoFocus
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label htmlFor="event-date" className="flex items-center gap-2 text-body-sm font-medium text-neutral-700 dark:text-neutral-dark-300 mb-1">
                      <Calendar className="w-4 h-4" />
                      Date
                    </label>
                    <input
                      id="event-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-900 text-neutral-900 dark:text-neutral-dark-50 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-body"
                      disabled={phase === 'loading'}
                    />
                  </div>

                  {/* Time row: all-day toggle + start/end */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="flex items-center gap-2 text-body-sm font-medium text-neutral-700 dark:text-neutral-dark-300">
                        <Clock className="w-4 h-4" />
                        Time
                      </label>
                      <button
                        type="button"
                        onClick={toggleAllDay}
                        disabled={phase === 'loading'}
                        className="min-h-[44px] px-3 py-2 rounded-lg text-body-sm font-medium text-accent-primary dark:text-accent-primary-light hover:bg-accent-primary/10 dark:hover:bg-accent-primary/20 transition-colors"
                      >
                        {isAllDay ? 'Set time' : 'All day'}
                      </button>
                    </div>
                    {!isAllDay && (
                      <div className="flex gap-3">
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="flex-1 min-h-[48px] px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-900 text-neutral-900 dark:text-neutral-dark-50 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-body"
                          disabled={phase === 'loading'}
                        />
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="flex-1 min-h-[48px] px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-900 text-neutral-900 dark:text-neutral-dark-50 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-body"
                          disabled={phase === 'loading'}
                        />
                      </div>
                    )}
                  </div>

                  {/* Duration (display when timed) */}
                  {!isAllDay && (durationMinutes !== '' && durationMinutes !== null) && (
                    <p className="text-body-sm text-neutral-600 dark:text-neutral-dark-400">
                      Duration: {String(durationMinutes)} min
                    </p>
                  )}

                  {/* Family member */}
                  <div>
                    <label htmlFor="event-member" className="flex items-center gap-2 text-body-sm font-medium text-neutral-700 dark:text-neutral-dark-300 mb-1">
                      <User className="w-4 h-4" />
                      Assigned to
                    </label>
                    <select
                      id="event-member"
                      value={selectedMemberId ?? ''}
                      onChange={(e) => setSelectedMemberId(e.target.value || null)}
                      className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-900 text-neutral-900 dark:text-neutral-dark-50 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-body appearance-none cursor-pointer"
                      disabled={phase === 'loading'}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23757575'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 12px center',
                        backgroundSize: '20px',
                        paddingRight: '40px',
                      }}
                    >
                      <option value="">No one</option>
                      {familyMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label htmlFor="event-notes" className="flex items-center gap-2 text-body-sm font-medium text-neutral-700 dark:text-neutral-dark-300 mb-1">
                      <FileText className="w-4 h-4" />
                      Notes
                    </label>
                    <textarea
                      id="event-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional notes"
                      rows={2}
                      className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-dark-600 bg-white dark:bg-neutral-dark-900 text-neutral-900 dark:text-neutral-dark-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-dark-500 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-body resize-none"
                      disabled={phase === 'loading'}
                    />
                  </div>
                </div>

                {error && (
                  <p className="mt-3 text-body-sm text-accent-error-dark dark:text-accent-error-light" role="alert">
                    {error}
                  </p>
                )}

                {/* Actions */}
                <div className="mt-6 flex flex-col gap-3">
                  <motion.button
                    type="button"
                    onClick={handleAddToCalendar}
                    disabled={!!validationError || phase === 'loading'}
                    className="w-full min-h-[56px] rounded-xl font-display text-heading-sm font-semibold text-white flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, #5B9BD5 0%, #42A5F5 50%, #64B5F6 100%)',
                      boxShadow: '0 4px 14px rgba(91, 155, 213, 0.4)',
                    }}
                    whileTap={{ scale: 0.98 }}
                    whileHover={!validationError && phase !== 'loading' ? { scale: 1.01 } : undefined}
                  >
                    {phase === 'loading' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Adding…
                      </>
                    ) : (
                      'Add to Calendar'
                    )}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={handleCancel}
                    disabled={phase === 'loading'}
                    className="w-full min-h-[56px] rounded-xl font-display text-heading-sm font-semibold text-neutral-700 dark:text-neutral-dark-300 bg-neutral-100 dark:bg-neutral-dark-700 hover:bg-neutral-200 dark:hover:bg-neutral-dark-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:opacity-50 transition-colors"
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
      )}
    </AnimatePresence>
  );
}
