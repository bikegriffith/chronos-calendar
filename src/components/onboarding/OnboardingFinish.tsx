import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar, Zap, Users, Mic } from 'lucide-react'

const TIPS = [
  {
    icon: Calendar,
    title: 'Tap a day',
    body: 'Tap any day on the calendar to add an event for that date.',
  },
  {
    icon: Users,
    title: 'Filter by person',
    body: 'Use the family filter to show only certain people’s events.',
  },
  {
    icon: Mic,
    title: 'Add by voice',
    body: 'Use the microphone button to add events by speaking.',
  },
  {
    icon: Zap,
    title: 'Syncs with Google',
    body: 'Changes sync with your Google Calendar. Edit in either place.',
  },
]

export interface OnboardingFinishProps {
  onStart: () => void
}

export default function OnboardingFinish({ onStart }: OnboardingFinishProps) {
  const [tipIndex, setTipIndex] = useState(0)
  const tip = TIPS[tipIndex]

  const goPrev = () => {
    setTipIndex((i) => (i === 0 ? TIPS.length - 1 : i - 1))
  }
  const goNext = () => {
    setTipIndex((i) => (i === TIPS.length - 1 ? 0 : i + 1))
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
        className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <motion.span
          className="text-4xl"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          ✨
        </motion.span>
      </motion.div>
      <motion.h2
        className="mt-8 text-3xl font-bold text-slate-800 dark:text-slate-100"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        You’re all set!
      </motion.h2>
      <motion.p
        className="mt-2 text-slate-600 dark:text-slate-400"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Here are a few quick tips to get you started.
      </motion.p>

      {/* Tips carousel */}
      <motion.div
        className="mt-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden min-h-[140px] flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={tipIndex}
              className="p-6 flex flex-col items-center flex-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <tip.icon className="w-10 h-10 text-sky-500 mb-3" />
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                {tip.title}
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {tip.body}
              </p>
            </motion.div>
          </AnimatePresence>
          <div className="flex items-center justify-center gap-4 pb-4">
            <button
              type="button"
              onClick={goPrev}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              aria-label="Previous tip"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-1.5">
              {TIPS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTipIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === tipIndex
                      ? 'bg-sky-500'
                      : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400'
                  }`}
                  aria-label={`Tip ${i + 1}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={goNext}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              aria-label="Next tip"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>

      <motion.button
        type="button"
        onClick={onStart}
        className="mt-10 px-8 py-4 rounded-2xl font-semibold text-white text-lg shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500"
        style={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
          boxShadow: '0 10px 40px -10px rgba(14, 165, 233, 0.5)',
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.03, boxShadow: '0 14px 48px -10px rgba(14, 165, 233, 0.55)' }}
        whileTap={{ scale: 0.98 }}
      >
        Start using calendar
      </motion.button>
    </motion.div>
  )
}
