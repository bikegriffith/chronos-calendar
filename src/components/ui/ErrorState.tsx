import { motion } from 'framer-motion';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  variant?: 'generic' | 'offline' | 'api';
  className?: string;
}

/** Friendly error message with optional illustration and retry. */
export function ErrorState({
  title,
  message,
  onRetry,
  variant = 'generic',
  className = '',
}: ErrorStateProps) {
  const illustration = variant === 'offline' ? <OfflineIllustration /> : variant === 'api' ? <ApiErrorIllustration /> : <GenericErrorIllustration />;
  const defaultTitle = variant === 'offline' ? "You're offline" : variant === 'api' ? 'Something went wrong' : 'Something went wrong';

  return (
    <motion.div
      className={`flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto ${className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      role="alert"
    >
      <div className="w-20 h-20 mb-4 text-neutral-300 dark:text-neutral-dark-600 flex items-center justify-center" aria-hidden>
        {illustration}
      </div>
      <h3 className="font-display text-heading-sm font-semibold text-neutral-900 dark:text-neutral-dark-50 mb-1">
        {title ?? defaultTitle}
      </h3>
      <p className="text-body-sm text-neutral-600 dark:text-neutral-dark-400 mb-5">
        {message}
      </p>
      {onRetry && (
        <motion.button
          type="button"
          onClick={onRetry}
          className="min-h-[44px] px-5 rounded-xl font-medium text-white bg-accent-primary dark:bg-accent-primary-light hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 transition-opacity"
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          Try again
        </motion.button>
      )}
    </motion.div>
  );
}

function GenericErrorIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-current">
      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" fill="none" />
      <path d="M40 24v20M40 52v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function OfflineIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-current">
      <path d="M20 30c-4 4-6 10-6 16s2 12 6 16l4-4c-2.5-2.5-4-6-4-12s1.5-9.5 4-12L20 30z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M60 30l-4 4c2.5 2.5 4 6 4 12s-1.5 9.5-4 12l4 4c4-4 6-10 6-16s-2-12-6-16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M40 44V24M28 56l24-24M52 56L28 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
    </svg>
  );
}

function ApiErrorIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-current">
      <rect x="20" y="20" width="40" height="40" rx="8" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" fill="none" />
      <path d="M28 44h24M28 52h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
      <path d="M36 28v-4a4 4 0 118 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
    </svg>
  );
}
