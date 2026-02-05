import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CalendarApi } from '@fullcalendar/core';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { APP_NAME } from '@shared/constants';
import type { FamilyMember } from '@shared/types';
import { familyColorList } from '../styles/theme';
import { getCalendarList, getEvents } from '../services/calendarService';
import type { CalendarAccount } from '../services/calendarService';
import CalendarView from './CalendarView';

// Default family members (can later come from store/API)
const DEFAULT_FAMILY_MEMBERS: FamilyMember[] = [
  { id: '1', name: 'Mom', color: familyColorList[0].DEFAULT },
  { id: '2', name: 'Dad', color: familyColorList[1].DEFAULT },
  { id: '3', name: 'Alex', color: familyColorList[2].DEFAULT },
  { id: '4', name: 'Sam', color: familyColorList[3].DEFAULT },
  { id: '5', name: 'Jesse', color: familyColorList[4].DEFAULT },
];

const VIEW_MAP = {
  month: 'dayGridMonth',
  week: 'timeGridWeek',
  day: 'timeGridDay',
} as const;
type ViewType = keyof typeof VIEW_MAP;

const SWIPE_THRESHOLD_PX = 60;

function getDateRangeForView(date: Date, viewType: ViewType): { start: string; end: string } {
  let start: Date;
  let end: Date;
  if (viewType === 'month') {
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

export default function MainLayout() {
  const calendarRef = useRef<import('@fullcalendar/react').default | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set()); // empty = show all
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [calendarList, setCalendarList] = useState<CalendarAccount[]>([]);
  const [events, setEvents] = useState<import('../services/calendarService').CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [calendarColors, setCalendarColors] = useState<Record<string, string>>({});
  const [calendarNames, setCalendarNames] = useState<Record<string, string>>({});

  const familyMembers = DEFAULT_FAMILY_MEMBERS;

  const calendarApi = useRef<CalendarApi | null>(null);

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

  const calendarIds = calendarList.map((c) => c.id);
  useEffect(() => {
    if (calendarIds.length === 0) return;
    const range = getDateRangeForView(currentDate, view);
    const colorsMap = new Map<string, string>(Object.entries(calendarColors));
    setEventsLoading(true);
    getEvents(calendarIds, range, colorsMap)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));
  }, [currentDate, view, calendarIds.join(',')]);

  const handleDatesSet = useCallback((dateInfo: { start: Date; view: { type: string } }) => {
    const api = calendarRef.current?.getApi();
    if (api) calendarApi.current = api;
    setCurrentDate(dateInfo.start);
  }, []);

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (next.size === 0 || next.size === familyMembers.length) return new Set<string>();
      return next;
    });
  };

  const isFiltering = selectedMemberIds.size > 0;
  const isMemberSelected = (id: string) => !isFiltering || selectedMemberIds.has(id);

  const goPrev = () => calendarApi.current?.prev();
  const goNext = () => calendarApi.current?.next();

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

  const changeView = (v: ViewType) => {
    setView(v);
    calendarApi.current?.changeView(VIEW_MAP[v]);
  };

  const handleEventClick = useCallback((_event: import('../services/calendarService').CalendarEvent) => {
    // TODO: open event details modal/sheet
  }, []);
  const handleEventLongPress = useCallback((_event: import('../services/calendarService').CalendarEvent) => {
    // TODO: open edit modal
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-neutral-50">
      {/* Top Bar — fixed, glass morphism */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between gap-3 px-4 py-3 min-h-[56px] bg-white/70 dark:bg-neutral-dark-800/80 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-dark-700/80"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display text-heading-md font-semibold text-neutral-900 dark:text-neutral-dark-50 truncate">
            {APP_NAME}
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center min-w-0">
          <time
            dateTime={currentDate.toISOString()}
            className="font-display text-heading-lg font-medium text-neutral-800 dark:text-neutral-dark-100 tabular-nums"
          >
            {view === 'month'
              ? format(currentDate, 'MMMM yyyy')
              : view === 'week'
                ? `${format(currentDate, 'MMM d')} – ${format(new Date(currentDate.getTime() + 6 * 24 * 60 * 60 * 1000), 'MMM d, yyyy')}`
                : format(currentDate, 'EEEE, MMM d, yyyy')}
          </time>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label="Settings"
            className="flex items-center justify-center w-12 h-12 rounded-full text-neutral-600 dark:text-neutral-dark-300 hover:bg-neutral-200/80 dark:hover:bg-neutral-dark-700/80 hover:text-neutral-900 dark:hover:text-neutral-dark-50 transition-colors min-h-[48px] min-w-[48px]"
          >
            <SettingsIcon className="w-6 h-6" />
          </button>
        </div>
      </motion.header>

      {/* Family filter chips — below top bar, scrollable */}
      <div className="fixed top-[56px] left-0 right-0 z-20 px-3 py-2 bg-white/50 dark:bg-neutral-dark-900/50 backdrop-blur-md border-b border-neutral-200/60 dark:border-neutral-dark-700/60">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <motion.button
            type="button"
            onClick={() => setSelectedMemberIds(new Set())}
            className={`shrink-0 rounded-full px-4 py-2 text-body-sm font-medium transition-colors min-h-[48px] flex items-center ${
              !isFiltering
                ? 'bg-accent-primary text-white shadow-sm'
                : 'bg-neutral-200 dark:bg-neutral-dark-700 text-neutral-700 dark:text-neutral-dark-300 hover:bg-neutral-300 dark:hover:bg-neutral-dark-600'
            }`}
            whileTap={{ scale: 0.98 }}
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
                className="shrink-0 rounded-full pl-3 pr-4 py-2 text-body-sm font-medium transition-colors min-h-[48px] flex items-center gap-2 border-2 border-transparent"
                style={{
                  backgroundColor: selected ? `${member.color}22` : 'transparent',
                  borderColor: selected ? member.color : 'transparent',
                  color: selected ? undefined : 'var(--chronos-text-muted)',
                }}
                whileTap={{ scale: 0.98 }}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: member.color }}
                />
                {member.name}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Calendar — main area with padding for fixed top bar + filter chips */}
      <main
        className="flex-1 flex flex-col min-h-0 pb-20"
        style={{ paddingTop: '112px' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 min-h-0 p-3"
          >
            <div className="h-full min-h-[320px] relative">
              {eventsLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-neutral-dark-900/60 rounded-xl z-10">
                  <div className="text-body-sm text-neutral-600 dark:text-neutral-dark-400">Loading events…</div>
                </div>
              )}
              <CalendarView
                calendarRef={calendarRef}
                events={events}
                calendarColors={calendarColors}
                calendarNames={calendarNames}
                viewType={view}
                currentDate={currentDate}
                onDatesSet={setCurrentDate}
                onEventClick={handleEventClick}
                onEventLongPress={handleEventLongPress}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Bar — fixed */}
      <motion.footer
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-2 px-4 py-3 min-h-[72px] bg-white/70 dark:bg-neutral-dark-800/80 backdrop-blur-xl border-t border-neutral-200/80 dark:border-neutral-dark-700/80"
      >
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 min-h-[48px] font-medium text-neutral-700 dark:text-neutral-dark-300 bg-neutral-100 dark:bg-neutral-dark-700 hover:bg-neutral-200 dark:hover:bg-neutral-dark-600 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Event
        </button>

        <motion.button
          type="button"
          aria-label="Voice input"
          className="flex items-center justify-center w-16 h-16 rounded-full bg-accent-primary text-white shadow-lg hover:bg-accent-primary-dark focus:outline-none focus-ring-2 focus:ring-accent-primary focus:ring-offset-2 dark:focus:ring-offset-neutral-dark-900 min-w-[48px] min-h-[48px]"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          whileTap={{ scale: 0.95 }}
        >
          <VoiceIcon className="w-8 h-8" />
        </motion.button>

        <div className="flex items-center rounded-xl bg-neutral-100 dark:bg-neutral-dark-700 p-1 min-h-[48px]">
          {(['month', 'week', 'day'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => changeView(v)}
              className={`rounded-lg px-3 py-2 text-body-sm font-medium capitalize min-h-[48px] min-w-[48px] transition-colors ${
                view === v
                  ? 'bg-white dark:bg-neutral-dark-600 text-neutral-900 dark:text-neutral-dark-50 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-dark-400 hover:text-neutral-900 dark:hover:text-neutral-dark-200'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </motion.footer>
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

function VoiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  );
}
