import { addDays } from 'date-fns';

export interface CalendarSkeletonProps {
  /** 'upcoming' shows 4-day columns; 'month' shows 5–6 row grid */
  variant: 'upcoming' | 'month';
  currentDate?: Date;
  className?: string;
}

/** Skeleton for calendar/upcoming view while events load. Same layout as real view; only a subtle background shimmer (no sliding). */
export function CalendarSkeleton({ variant, currentDate = new Date(), className = '' }: CalendarSkeletonProps) {
  if (variant === 'upcoming') {
    const days = [0, 1, 2, 3].map((i) => addDays(currentDate, i));
    return (
      <div
        className={`chronos-upcoming-view chronos-glass-card h-full min-h-0 rounded-2xl overflow-hidden flex flex-col ${className}`}
        aria-busy="true"
        aria-label="Loading calendar"
      >
        {/* Same header as UpcomingView: grid grid-cols-4 gap-3 px-3 pt-4 pb-3 border-b shrink-0 */}
        <div className="grid grid-cols-4 gap-3 px-3 pt-4 pb-3 border-b border-[var(--chronos-grid-line)] shrink-0">
          {days.map((day) => (
            <div key={day.toISOString()} className="text-center min-w-0">
              <div className="chronos-shimmer h-3 w-16 mx-auto rounded inline-block" />
              <div className="chronos-shimmer h-4 w-20 mx-auto mt-2 rounded inline-block" />
            </div>
          ))}
        </div>
        {/* Same content area as UpcomingView: grid grid-cols-4 gap-3 flex-1 min-h-0 p-3 overflow-hidden */}
        <div className="grid grid-cols-4 gap-3 flex-1 min-h-0 p-3 overflow-hidden">
          {[0, 1, 2, 3].map((col) => (
            <div
              key={col}
              className="flex flex-col gap-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/10 min-h-0 overflow-hidden"
            >
              <div className="p-3 flex flex-col gap-3 min-h-[120px]">
                {[0, 1, 2].map((i) => (
                  <EventCardSkeleton key={i} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* Month: same outer structure as calendar view, fixed grid so it doesn’t shift */
  return (
    <div
      className={`chronos-calendar-view chronos-glass-card h-full min-h-0 rounded-2xl overflow-hidden flex flex-col ${className}`}
      aria-busy="true"
      aria-label="Loading calendar"
    >
      <div className="grid grid-cols-7 gap-px p-3 border-b border-[var(--chronos-grid-line)] shrink-0">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="chronos-shimmer h-4 w-10 rounded inline-block" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 p-3 flex-1 min-h-0 overflow-auto">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="min-h-[48px] rounded-xl bg-white/30 dark:bg-white/5 flex flex-col justify-center p-2">
            <div className="chronos-shimmer h-3 w-6 rounded inline-block" />
            <div className="chronos-shimmer h-6 w-full mt-1 rounded inline-block max-w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EventCardSkeleton() {
  return (
    <div className="min-h-[68px] rounded-xl py-4 px-4 flex items-start gap-3 bg-white/50 dark:bg-white/5 border border-white/20">
      <span className="chronos-shimmer shrink-0 w-9 h-9 rounded-full" />
      <span className="flex-1 min-w-0 flex flex-col gap-2">
        <span className="chronos-shimmer h-3 w-12 rounded" />
        <span className="chronos-shimmer h-4 w-full rounded" />
      </span>
    </div>
  );
}
