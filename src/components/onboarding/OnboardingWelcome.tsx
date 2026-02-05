import { motion } from 'framer-motion'
import { Calendar, Users, Mic, Sparkles } from 'lucide-react'
import { APP_NAME } from '@shared/constants'

export interface OnboardingWelcomeProps {
  onGetStarted: () => void
}

/** Hero illustration: calendar with family silhouettes and soft gradient shapes */
function HeroIllustration() {
  return (
    <motion.div
      className="relative w-full max-w-[280px] mx-auto aspect-[4/3] flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Soft background orbs */}
      <div
        className="absolute inset-0 rounded-[2rem] opacity-90"
        style={{
          background: `
            radial-gradient(ellipse 80% 70% at 50% 30%, rgba(147, 197, 253, 0.35), transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 70%, rgba(253, 186, 116, 0.25), transparent 50%),
            radial-gradient(ellipse 50% 40% at 20% 80%, rgba(196, 181, 253, 0.2), transparent 45%)
          `,
        }}
      />
      {/* Calendar card shape */}
      <motion.div
        className="relative w-[200px] h-[160px] rounded-2xl shadow-xl flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.8)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        }}
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="h-10 flex items-center justify-center gap-1.5 px-3 border-b border-slate-200/80 bg-slate-50/80">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="w-8 h-6 rounded-md bg-sky-100"
              style={{ backgroundColor: ['#e0f2fe', '#fce7f3', '#fef3c7'][i - 1] }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
            />
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 gap-0.5 p-2">
          {Array.from({ length: 21 }).map((_, i) => (
            <motion.div
              key={i}
              className="aspect-square rounded-md bg-slate-100/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.02 }}
            />
          ))}
        </div>
      </motion.div>
      {/* Floating icons */}
      <motion.div
        className="absolute -top-2 -right-2 w-12 h-12 rounded-2xl bg-white/90 shadow-lg flex items-center justify-center border border-white/80"
        initial={{ scale: 0, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 22 }}
      >
        <Calendar className="w-6 h-6 text-sky-500" />
      </motion.div>
      <motion.div
        className="absolute -bottom-1 -left-2 w-11 h-11 rounded-xl bg-white/90 shadow-lg flex items-center justify-center border border-white/80"
        initial={{ scale: 0, rotate: 12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.55, type: 'spring', stiffness: 260, damping: 22 }}
      >
        <Users className="w-5 h-5 text-rose-400" />
      </motion.div>
    </motion.div>
  )
}

const FEATURES = [
  { icon: Calendar, label: 'One calendar for the whole family', color: 'text-sky-500' },
  { icon: Users, label: 'Color-coded by person', color: 'text-rose-400' },
  { icon: Mic, label: 'Add events by voice', color: 'text-amber-500' },
  { icon: Sparkles, label: 'Smart and simple', color: 'text-violet-400' },
]

export default function OnboardingWelcome({ onGetStarted }: OnboardingWelcomeProps) {
  return (
    <motion.div
      className="flex flex-col items-center text-center px-6 py-8 min-h-[80vh] justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4 }}
    >
      <HeroIllustration />
      <motion.h1
        className="mt-10 text-3xl md:text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Welcome to your Family Calendar
      </motion.h1>
      <motion.p
        className="mt-3 text-slate-600 dark:text-slate-400 max-w-sm text-base leading-relaxed"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        {APP_NAME} brings everyone’s schedule together in one place—see who’s busy, add events by voice, and keep family life in sync.
      </motion.p>
      <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3">
        {FEATURES.map(({ icon: Icon, label, color }, i) => (
          <motion.li
            key={label}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.06, duration: 0.4 }}
          >
            <Icon className={`w-4 h-4 shrink-0 ${color}`} />
            <span>{label}</span>
          </motion.li>
        ))}
      </ul>
      <motion.button
        type="button"
        onClick={onGetStarted}
        className="mt-10 px-8 py-4 rounded-2xl font-semibold text-white text-lg shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500"
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
          boxShadow: '0 10px 40px -10px rgba(59, 130, 246, 0.5), 0 0 0 1px rgba(255,255,255,0.1) inset',
        }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        whileHover={{ scale: 1.03, boxShadow: '0 14px 48px -10px rgba(59, 130, 246, 0.55)' }}
        whileTap={{ scale: 0.98 }}
      >
        Get Started
      </motion.button>
    </motion.div>
  )
}
