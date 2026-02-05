import { motion, useReducedMotion } from 'framer-motion';

export interface SyncProgressBarProps {
  visible: boolean;
  className?: string;
}

/** Thin indeterminate progress bar for sync (top of bar). GPU-friendly. Respects reduced motion. */
export function SyncProgressBar({ visible, className = '' }: SyncProgressBarProps) {
  const shouldReduceMotion = useReducedMotion();
  if (!visible) return null;

  return (
    <div
      className={`absolute left-0 right-0 top-0 h-0.5 overflow-hidden rounded-b bg-neutral-200 dark:bg-neutral-dark-700 ${className}`}
      aria-hidden
    >
      <motion.div
        className="absolute inset-y-0 w-1/3 bg-accent-primary opacity-80 rounded-full"
        initial={{ x: '-100%' }}
        animate={{ x: shouldReduceMotion ? '0%' : '400%' }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : {
                duration: 1.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
        style={{ willChange: shouldReduceMotion ? 'auto' : 'transform' }}
      />
    </div>
  );
}
