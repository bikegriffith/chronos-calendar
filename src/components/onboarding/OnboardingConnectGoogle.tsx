import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Calendar } from 'lucide-react'
import { login } from '@/services/googleAuth'

function GoogleLogoIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export interface OnboardingConnectGoogleProps {
  /** When true, show success animation and call onContinue after delay */
  alreadyConnected?: boolean
  onContinue: () => void
}

export default function OnboardingConnectGoogle({
  alreadyConnected = false,
  onContinue,
}: OnboardingConnectGoogleProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showSuccess = alreadyConnected

  const handleConnect = async () => {
    setError(null)
    setLoading(true)
    try {
      await login()
      // Redirects to Google; on return we'll have alreadyConnected and show success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  // If we're already connected (e.g. just returned from OAuth), show success then continue
  if (showSuccess) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[70vh] px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <motion.div
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Check className="w-12 h-12 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
          </motion.div>
        </motion.div>
        <motion.h2
          className="mt-6 text-2xl font-bold text-slate-800 dark:text-slate-100"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          Connected!
        </motion.h2>
        <motion.p
          className="mt-2 text-slate-600 dark:text-slate-400"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          Your Google Calendar is linked. Let’s set up your family.
        </motion.p>
        <motion.button
          type="button"
          onClick={onContinue}
          className="mt-8 px-6 py-3 rounded-xl bg-sky-500 text-white font-medium hover:bg-sky-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Continue
        </motion.button>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="flex flex-col items-center text-center px-6 py-8 min-h-[80vh] justify-center"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Calendar className="w-10 h-10 text-sky-500" />
      </motion.div>
      <h2 className="mt-8 text-2xl font-bold text-slate-800 dark:text-slate-100">
        Connect Google Calendar
      </h2>
      <p className="mt-3 text-slate-600 dark:text-slate-400 max-w-md text-left mx-auto">
        Chronos will request access to your Google Calendar so we can show your events and let you add or edit them. We only read and write calendar data—nothing else. You can revoke access anytime in your Google account settings.
      </p>
      <div className="mt-8 flex flex-col items-center gap-4">
        <motion.button
          type="button"
          onClick={handleConnect}
          disabled={loading}
          className="flex items-center gap-3 px-6 py-3.5 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-70 disabled:pointer-events-none transition-all"
          whileHover={!loading ? { scale: 1.02 } : undefined}
          whileTap={!loading ? { scale: 0.98 } : undefined}
        >
          <GoogleLogoIcon />
          <span>{loading ? 'Connecting…' : 'Connect Google Calendar'}</span>
        </motion.button>
        <AnimatePresence>
          {error && (
            <motion.p
              className="text-sm text-red-500 max-w-xs"
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
