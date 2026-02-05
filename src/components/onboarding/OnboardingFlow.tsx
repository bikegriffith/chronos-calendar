import { motion, AnimatePresence } from 'framer-motion'
import type { ChronosConfig, OnboardingStep } from '@shared/types'
import { setConfig } from '@/services/configService'
import OnboardingWelcome from './OnboardingWelcome'
import OnboardingConnectGoogle from './OnboardingConnectGoogle'
import OnboardingFamily from './OnboardingFamily'
import OnboardingVoice from './OnboardingVoice'
import OnboardingFinish from './OnboardingFinish'

const STEP_LABELS: Record<OnboardingStep, string> = {
  0: 'Welcome',
  1: 'Connect',
  2: 'Family',
  3: 'Voice',
  4: 'Finish',
}

const TOTAL_STEPS = 5

export interface OnboardingFlowProps {
  config: ChronosConfig
  authenticated: boolean
  onConfigUpdate: (config: ChronosConfig) => void
  onComplete: () => void
}

export default function OnboardingFlow({
  config,
  authenticated,
  onConfigUpdate,
  onComplete,
}: OnboardingFlowProps) {
  const step: OnboardingStep = config.onboardingStep ?? 0

  const goToStep = async (next: OnboardingStep) => {
    const updated = await setConfig({ onboardingStep: next })
    onConfigUpdate(updated)
  }

  const handleFinish = async () => {
    await setConfig({ onboardingComplete: true })
    onConfigUpdate(await setConfig({}))
    onComplete()
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Progress bar */}
      <motion.div
        className="h-1 bg-slate-200 dark:bg-slate-800 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-sky-500 to-violet-500"
          initial={{ width: 0 }}
          animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </motion.div>

      {/* Step dots (optional, minimal) */}
      <div className="flex justify-center gap-2 py-4">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <motion.div
            key={i}
            className={`h-2 rounded-full ${
              i <= step ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-700'
            }`}
            initial={false}
            animate={{
              width: i <= step ? 24 : 8,
              opacity: i <= step ? 1 : 0.5,
            }}
            transition={{ duration: 0.3 }}
            title={STEP_LABELS[i as OnboardingStep]}
          />
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <OnboardingWelcome
              key="welcome"
              onGetStarted={() => goToStep(1)}
            />
          )}
          {step === 1 && (
            <OnboardingConnectGoogle
              key="connect"
              alreadyConnected={authenticated}
              onContinue={() => goToStep(2)}
            />
          )}
          {step === 2 && (
            <OnboardingFamily
              key="family"
              onContinue={() => goToStep(3)}
              onConfigUpdate={onConfigUpdate}
            />
          )}
          {step === 3 && (
            <OnboardingVoice
              key="voice"
              onContinue={() => goToStep(4)}
            />
          )}
          {step === 4 && (
            <OnboardingFinish
              key="finish"
              onStart={handleFinish}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
