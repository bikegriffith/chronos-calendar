import { motion } from 'framer-motion'
import FamilyMemberSetup from '@/components/FamilyMemberSetup'
import type { ChronosConfig } from '@shared/types'
import { setConfig, getConfig } from '@/services/configService'

export interface OnboardingFamilyProps {
  onContinue: () => void
  onConfigUpdate: (config: ChronosConfig) => void
}

export default function OnboardingFamily({ onContinue, onConfigUpdate }: OnboardingFamilyProps) {
  const handleComplete = async () => {
    await setConfig({ onboardingStep: 3 })
    onConfigUpdate(await getConfig())
    onContinue()
  }

  return (
    <motion.div
      className="flex flex-col h-full min-h-[80vh]"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex-shrink-0 px-4 pt-6 pb-2 text-center">
        <motion.h2
          className="text-xl font-bold text-slate-800 dark:text-slate-100"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Who’s in your family?
        </motion.h2>
        <motion.p
          className="mt-1 text-slate-600 dark:text-slate-400 text-sm"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          Add each person, pick a color, and link their Google calendars.
        </motion.p>
      </div>
      <div className="flex-1 overflow-hidden">
        <FamilyMemberSetup
          onComplete={handleComplete}
          finishButtonLabel="Continue"
          hideTitle
        />
      </div>
    </motion.div>
  )
}
