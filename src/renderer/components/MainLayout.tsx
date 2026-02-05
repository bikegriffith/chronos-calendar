import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import type { CalendarApi } from '@fullcalendar/core';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, addDays } from 'date-fns';
import type { FamilyMember } from '@shared/types';
import { familyColorList } from '../styles/theme';
import { getThemeOrDefault } from '../styles/themes';
import { getCalendarList, getEvents, createEvent, deleteEvent } from '../services/calendarService';
import type { CalendarAccount } from '../services/calendarService';
import { getConfig } from '../services/configService';
import { parseTranscriptionToEvent, AIEventParserError } from '../services/aiEventParser';
import type { ParsedEvent } from '../services/aiEventParser';
import type { CalendarEvent as ServiceCalendarEvent } from '../services/calendarService';
import CalendarView from './CalendarView';
import UpcomingView from './UpcomingView';
import VoiceButton from './VoiceButton';
import EventConfirmationModal from './EventConfirmationModal';
import EventDetailsPopover from './EventDetailsPopover';
import EventQuickActionsSheet from './EventQuickActionsSheet';
import EditEventModal from './EditEventModal';
import SettingsScreen from './SettingsScreen';
import type { ChronosConfig } from '@shared/types';

const VIEW_MAP = {
  upcoming: 'dayGridMonth',
  month: 'dayGridMonth',
  week: 'timeGridWeek',
  day: 'timeGridDay',
} as const;
type ViewType = keyof typeof VIEW_MAP;

const SWIPE_THRESHOLD_PX = 60;
const DRAG_THRESHOLD_PX = 80;
const SPRING_TRANSITION = { type: 'spring' as const, damping: 25, stiffness: 300 };

function getDateRangeForView(date: Date, viewType: ViewType): { start: string; end: string } {
  let start: Date;
  let end: Date;
  if (viewType === 'upcoming') {
    start = startOfDay(date);
    end = startOfDay(addDays(date, 4));
  } else if (viewType === 'month') {
    start = startOfMonth(date);
    end = endOfMonth(date);
  } else if (viewType === 'week') {
    start = startOfWeek(date, { weekStartsOn: 0 });
    end = endOfWeek(date, { weekStartsOn: 0 });
  } else {
    start = startOfDay(date);
    end = endOfDay(date);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function MainLayout({ onLogout }: { onLogout?: () => void }) {
  const calendarRef = useRef<import('@fullcalendar/react').default | null>(null);
  const [config, setConfig] = useState<ChronosConfig | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('upcoming');
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const pinchStartDistance = useRef<number | null>(null);
  const lastPinchDistance = useRef<number | null>(null);
  const [calendarList, setCalendarList] = useState<CalendarAccount[]>([]);
  const [events, setEvents] = useState<ServiceCalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [calendarColors, setCalendarColors] = useState<Record<string, string>>({});
  const [calendarNames, setCalendarNames] = useState<Record<string, string>>({});
  const [eventToConfirm, setEventToConfirm] = useState<ParsedEvent | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [eventDetails, setEventDetails] = useState<{ event: ServiceCalendarEvent; anchorRect: DOMRect } | null>(null);
  const [quickActionsEvent, setQuickActionsEvent] = useState<ServiceCalendarEvent | null>(null);
  const [eventToEdit, setEventToEdit] = useState<ServiceCalendarEvent | null>(null);
  const [navDirection, setNavDirection] = useState(0);
  const dragX = useMotionValue(0);

  const familyMembers = useMemo(
    () => (config?.familyMembers?.length ? config.familyMembers : []) as FamilyMember[],
    [config?.familyMembers]
  );

  // Apply theme (pastel gradient + dark class for semantics)
  useEffect(() => {
    if (!config) return;
    const theme = getThemeOrDefault(config.settings.theme);
    document.documentElement.setAttribute('data-theme', theme.id);
    if (theme.dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [config]);

  const calendarApi = useRef<CalendarApi | null>(null);

  useEffect(() => {
    getConfig().then(setConfig);
  }, []);

  useEffect(() => {
    getCalendarList()
      .then((list) => {
        setCalendarList(list);
        const colors: Record<string, string> = {};
        const names: Record<string, string> = {};
        list.forEach((cal, i) => {
          colors[cal.id] = cal.backgroundColor ?? familyColorList[i % familyColorList.length].DEFAULT;
          names[cal.id] = cal.summary || cal.id;
        });
        setCalendarColors(colors);
        setCalendarNames(names);
      })
      .catch(() => {});
  }, []);

  const memberIdByCalendarId = useMemo(() => {
    const map: Record<string, string> = {};
    familyMembers.forEach((m) => (m.calendarIds ?? []).forEach((cid) => (map[cid] = m.id)));
    return map;
  }, [familyMembers]);

  const calendarIds = useMemo(() => calendarList.map((c) => c.id), [calendarList]);
  const calendarIdsKey = calendarIds.join(',');
  const prevViewRef = useRef<ViewType>(view);
  useEffect(() => {
    if (calendarIds.length === 0) return;
    if (view === 'upcoming' && prevViewRef.current !== 'upcoming') {
      prevViewRef.current = view;
      return;
    }
    prevViewRef.current = view;
    const range = getDateRangeForView(currentDate, view);
    const colorsMap = new Map<string, string>(Object.entries(calendarColors));
    setEventsLoading(true);
    getEvents(calendarIds, range, colorsMap, view === 'upcoming')
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));
  }, [currentDate, view, calendarIdsKey, calendarIds, calendarColors, refreshKey]);

  const filteredEvents = useMemo(() => {
    if (selectedMemberIds.size === 0) return events;
    return events.filter((ev) => {
      const memberId = memberIdByCalendarId[ev.calendarId];
      return memberId && selectedMemberIds.has(memberId);
    });
  }, [events, selectedMemberIds, memberIdByCalendarId]);

  const colorsAndNamesFromMembers = useMemo(() => {
    const colors: Record<string, string> = { ...calendarColors };
    const names: Record<string, string> = { ...calendarNames };
    familyMembers.forEach((m) => {
      (m.calendarIds ?? []).forEach((cid) => {
        colors[cid] = m.color;
        names[cid] = m.name;
      });
    });
    return { colors, names };
  }, [familyMembers, calendarColors, calendarNames]);

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0 || next.size === familyMembers.length) return new Set<string>();
      return next;
    });
  };

  const isFiltering = selectedMemberIds.size > 0;
  const isMemberSelected = (id: string) => !isFiltering || selectedMemberIds.has(id);

  const goPrev = useCallback(() => {
    setNavDirection(-1);
    calendarApi.current?.prev();
  }, []);
  const goNext = useCallback(() => {
    setNavDirection(1);
    calendarApi.current?.next();
  }, []);

  const onDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      const { offset, velocity } = info;
      const shouldGoNext = offset.x < -DRAG_THRESHOLD_PX || velocity.x < -300;
      const shouldGoPrev = offset.x > DRAG_THRESHOLD_PX || velocity.x > 300;
      if (shouldGoNext) {
        setNavDirection(1);
        calendarApi.current?.next();
      } else if (shouldGoPrev) {
        setNavDirection(-1);
        calendarApi.current?.prev();
      }
      animate(dragX, 0, SPRING_TRANSITION);
    },
    [dragX]
  );

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const endX = e.changedTouches[0].clientX;
    const delta = endX - touchStartX;
    if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) {
      if (delta > 0) goPrev();
      else goNext();
    }
    setTouchStartX(null);
  };

  useEffect(() => {
    if (navDirection === 0) return;
    const t = setTimeout(() => setNavDirection(0), 400);
    return () => clearTimeout(t);
  }, [navDirection, currentDate]);

  const changeView = useCallback((v: ViewType) => {
    if (v === 'upcoming') setCurrentDate(new Date());
    setView(v);
    if (v !== 'upcoming') calendarApi.current?.changeView(VIEW_MAP[v]);
  }, []);

  const handlePinchEnd = useCallback(
    (distance: number) => {
      if (pinchStartDistance.current === null) return;
      const start = pinchStartDistance.current;
      pinchStartDistance.current = null;
      const ratio = distance / start;
      const views: ViewType[] = ['month', 'week', 'day'];
      const idx = views.indexOf(view);
      if (ratio > 1.2 && idx < 2) changeView(views[idx + 1]!);
      else if (ratio < 0.8 && idx > 0) changeView(views[idx - 1]!);
    },
    [view, changeView]
  );

  const onTouchMovePinch = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const a = e.touches[0]!;
      const b = e.touches[1]!;
      const d = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      if (pinchStartDistance.current === null) pinchStartDistance.current = d;
      lastPinchDistance.current = d;
    }
  }, []);
  const onTouchEndPinch = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length < 2) {
        const finalDistance = lastPinchDistance.current;
        if (pinchStartDistance.current !== null && finalDistance !== null) handlePinchEnd(finalDistance);
        pinchStartDistance.current = null;
        lastPinchDistance.current = null;
      }
    },
    [handlePinchEnd]
  );

  const handleEventClick = useCallback((event: ServiceCalendarEvent, anchorEl?: HTMLElement) => {
    setEventDetails(
      anchorEl
        ? { event, anchorRect: anchorEl.getBoundingClientRect() }
        : { event, anchorRect: new DOMRect(0, 0, 0, 0) }
    );
  }, []);
  const handleEventLongPress = useCallback((event: ServiceCalendarEvent) => {
    setEventDetails(null);
    setQuickActionsEvent(event);
  }, []);
  const handleDateDoubleClick = useCallback((date: Date) => {
    setEventToConfirm({
      title: '',
      startDate: format(date, 'yyyy-MM-dd'),
      startTime: null,
      endTime: null,
      durationMinutes: null,
      attendee: null,
      notes: null,
    });
  }, []);
  const handleDeleteEvent = useCallback(async (event: ServiceCalendarEvent) => {
    try {
      await deleteEvent(event.calendarId, event.id);
      setRefreshKey((k) => k + 1);
      setQuickActionsEvent(null);
    } catch {
      // Could show toast
    }
  }, []);
  const handleEditEvent = useCallback((event: ServiceCalendarEvent) => {
    setQuickActionsEvent(null);
    setEventToEdit(event);
  }, []);
  const handleEditSaved = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleVoiceResult = useCallback(async (text: string) => {
    const trimmed = text?.trim();
    if (!trimmed) return;
    setVoiceError(null);
    try {
      const parsed = await parseTranscriptionToEvent(trimmed);
      if (parsed) setEventToConfirm(parsed);
      else setVoiceError('Could not understand that as an event. Try something like "Dentist tomorrow at 2pm".');
    } catch (err) {
      const message = err instanceof AIEventParserError ? err.message : 'Failed to parse. Check your API key and try again.';
      setVoiceError(message);
    }
  }, []);

  const getCalendarIdForMember = useCallback(
    (memberId: string | null): string | undefined => {
      if (!memberId || calendarList.length === 0) return calendarList[0]?.id;
      const member = familyMembers.find((m) => m.id === memberId);
      if (!member?.calendarIds?.length) return calendarList[0]?.id;
      const first = member.calendarIds[0];
      return calendarList.some((c) => c.id === first) ? first : calendarList[0]?.id;
    },
    [calendarList, familyMembers]
  );

  const handleConfirmEvent = useCallback(
    async (calendarId: string, event: import('../store/calendarStore').NewEventInput) => {
      await createEvent(calendarId, event);
      setRefreshKey((k) => k + 1);
    },
    []
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-transparent">
      {/* Single compact bar: filters (left) | date (center) | settings (right) — liquid glass */}
      <motion.header
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="chronos-glass-bar fixed top-0 left-0 right-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 min-h-[52px]"
      >
        {/* Left: filter chips (scrollable) — same width as right for balance */}
        <div className="flex items-center justify-start min-w-0 overflow-hidden">
          {familyMembers.length > 0 ? (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide max-w-full">
              <motion.button
                type="button"
                onClick={() => setSelectedMemberIds(new Set())}
                className={`shrink-0 rounded-full px-3 py-1.5 text-body-sm font-medium transition-colors min-h-[40px] flex items-center ${
                  !isFiltering
                    ? 'bg-white/90 dark:bg-white/20 text-accent-primary shadow-sm'
                    : 'bg-white/40 dark:bg-white/10 text-neutral-600 dark:text-neutral-dark-400 hover:bg-white/60 dark:hover:bg-white/15'
                }`}
                whileTap={{ scale: 0.96 }}
              >
                All
              </motion.button>
              {familyMembers.map((member) => {
                const selected = isMemberSelected(member.id);
                return (
                  <motion.button
                    key={member.id}
                    type="button"
                    onClick={() => toggleMember(member.id)}
                    className={`shrink-0 rounded-full pl-1.5 pr-3 py-1.5 text-body-sm font-medium transition-colors min-h-[40px] flex items-center gap-1.5 border border-transparent ${selected ? '' : 'opacity-70'}`}
                    style={{
                      backgroundColor: selected ? `${member.color}28` : 'rgba(255,255,255,0.4)',
                      borderColor: selected ? `${member.color}66` : 'transparent',
                      color: selected ? 'var(--chronos-text)' : 'var(--chronos-text-muted)',
                    }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <span className="text-base leading-none" aria-hidden>{member.avatar ?? '👤'}</span>
                    {member.name}
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="w-2" aria-hidden />
          )}
        </div>

        {/* Center: date — truly centered in viewport */}
        <time
          dateTime={currentDate.toISOString()}
          className="font-display text-heading-md font-semibold text-neutral-900 dark:text-neutral-dark-50 tabular-nums text-center tracking-tight shrink-0 px-2"
        >
          {view === 'upcoming'
            ? `${format(currentDate, 'EEE MMM d')} – ${format(addDays(currentDate, 3), 'EEE MMM d, yyyy')}`
            : view === 'month'
              ? format(currentDate, 'MMMM yyyy')
              : view === 'week'
                ? `${format(currentDate, 'MMM d')} – ${format(new Date(currentDate.getTime() + 6 * 24 * 60 * 60 * 1000), 'MMM d, yyyy')}`
                : format(currentDate, 'EEEE, MMM d, yyyy')}
        </time>

        {/* Right: settings — same width as left for balance */}
        <div className="flex items-center justify-end min-w-0">
          <motion.button
            type="button"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
            className="chronos-glass-pill flex items-center justify-center w-10 h-10 rounded-full text-neutral-600 dark:text-neutral-dark-300 hover:text-neutral-900 dark:hover:text-neutral-dark-50 transition-colors shrink-0"
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <SettingsIcon className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.header>

      <SettingsScreen
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onDisconnect={onLogout}
        onConfigChange={config ? () => getConfig().then(setConfig) : undefined}
      />

      {/* Calendar — main area with swipe-to-navigate and padding for single compact bar */}
      <main
        className="flex-1 flex flex-col min-h-0 pb-20 overflow-hidden"
        style={{ paddingTop: 56 }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMovePinch}
        onTouchEnd={(e) => {
          onTouchEndPinch(e);
          onTouchEnd(e);
        }}
      >
        <motion.div
          className="flex-1 min-h-0 p-3"
          style={{ x: dragX }}
          drag="x"
          dragConstraints={{ left: -120, right: 120 }}
          dragElastic={0.2}
          onDragEnd={onDragEnd}
          dragMomentum={false}
          whileTap={{ cursor: 'grabbing' }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view === 'upcoming' ? `${view}-${currentDate.getTime()}` : `${view}-${currentDate.getFullYear()}-${currentDate.getMonth()}`}
              initial={{ opacity: 0, x: navDirection * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -navDirection * 40 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="h-full min-h-[320px] relative"
            >
              {eventsLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-neutral-dark-900/60 rounded-xl z-10">
                  <div className="text-body-sm text-neutral-600 dark:text-neutral-dark-400">Loading events…</div>
                </div>
              )}
              <div className="h-full min-h-0 pointer-events-auto">
                {view === 'upcoming' ? (
                  <UpcomingView
                    events={filteredEvents}
                    calendarColors={colorsAndNamesFromMembers.colors}
                    calendarNames={colorsAndNamesFromMembers.names}
                    currentDate={currentDate}
                    onEventClick={handleEventClick}
                    onEventLongPress={handleEventLongPress}
                  />
                ) : (
                  <CalendarView
                    calendarRef={calendarRef}
                    events={filteredEvents}
                    calendarColors={colorsAndNamesFromMembers.colors}
                    calendarNames={colorsAndNamesFromMembers.names}
                    viewType={view as 'month' | 'week' | 'day'}
                    currentDate={currentDate}
                    onDatesSet={(start) => {
                      const api = calendarRef.current?.getApi();
                      if (api) calendarApi.current = api;
                      setCurrentDate(start);
                    }}
                    onEventClick={handleEventClick}
                    onEventLongPress={handleEventLongPress}
                    onDateDoubleClick={handleDateDoubleClick}
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Bottom Bar — liquid glass */}
      <motion.footer
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.04 }}
        className="chronos-glass-bar fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-3 px-4 py-3 min-h-[76px] border-t border-[var(--chronos-border)]"
      >
        <motion.button
          type="button"
          onClick={() =>
            setEventToConfirm({
              title: '',
              startDate: format(new Date(), 'yyyy-MM-dd'),
              startTime: null,
              endTime: null,
              durationMinutes: null,
              attendee: null,
              notes: null,
            })
          }
          className="chronos-glass-pill flex items-center justify-center gap-2 rounded-2xl px-4 py-3 min-h-[48px] font-medium text-neutral-800 dark:text-neutral-dark-200 transition-colors"
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.01 }}
        >
          <PlusIcon className="w-5 h-5" />
          Add Event
        </motion.button>

        <VoiceButton
          onResult={handleVoiceResult}
          language={config?.settings?.voiceLanguage}
          className="-mt-2"
        />

        <div className="chronos-glass-pill flex items-center rounded-2xl p-1 min-h-[48px] gap-0.5">
          {(['upcoming', 'month', 'week', 'day'] as const).map((v) => (
            <motion.button
              key={v}
              type="button"
              onClick={() => changeView(v)}
              className={`rounded-xl px-3 py-2 text-body-sm font-medium capitalize min-h-[44px] min-w-[48px] transition-colors ${
                view === v
                  ? 'bg-white/90 dark:bg-white/20 text-neutral-900 dark:text-neutral-dark-50 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-dark-400 hover:text-neutral-900 dark:hover:text-neutral-dark-200'
              }`}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {v}
            </motion.button>
          ))}
        </div>
      </motion.footer>

      <EventConfirmationModal
        open={eventToConfirm !== null}
        initialEvent={eventToConfirm ?? ({ title: '', startDate: format(new Date(), 'yyyy-MM-dd'), startTime: null, endTime: null, durationMinutes: null, attendee: null, notes: null } as ParsedEvent)}
        familyMembers={familyMembers}
        getCalendarIdForMember={getCalendarIdForMember}
        defaultCalendarId={calendarList[0]?.id}
        onConfirm={handleConfirmEvent}
        onCancel={() => {
          setEventToConfirm(null);
          setVoiceError(null);
        }}
        onSuccess={() => setVoiceError(null)}
      />

      <EventDetailsPopover
        event={eventDetails?.event ?? null}
        anchorRect={eventDetails?.anchorRect ? { top: eventDetails.anchorRect.top, left: eventDetails.anchorRect.left, width: eventDetails.anchorRect.width, height: eventDetails.anchorRect.height } : null}
        onClose={() => setEventDetails(null)}
        calendarName={eventDetails?.event ? colorsAndNamesFromMembers.names[eventDetails.event.calendarId] : undefined}
      />

      <EventQuickActionsSheet
        event={quickActionsEvent}
        onClose={() => setQuickActionsEvent(null)}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />

      {eventToEdit && (
        <EditEventModal
          event={eventToEdit}
          onClose={() => setEventToEdit(null)}
          onSaved={handleEditSaved}
        />
      )}

      {voiceError && (
        <div className="fixed bottom-24 left-4 right-4 z-40 px-4 py-3 rounded-xl bg-neutral-800 dark:bg-neutral-dark-700 text-white text-body-sm shadow-lg flex items-center justify-between gap-3">
          <span>{voiceError}</span>
          <button
            type="button"
            onClick={() => setVoiceError(null)}
            className="shrink-0 text-white/80 hover:text-white underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

