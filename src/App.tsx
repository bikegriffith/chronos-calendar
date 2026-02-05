import { useState, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { isAuthenticated } from '@/services/googleAuth'
import { getConfig } from '@/services/configService'
import type { ChronosConfig } from '@shared/types'
import LoginScreen from '@/components/LoginScreen'
import MainLayout from '@/components/MainLayout'

const FamilyMemberSetup = lazy(() =>
  import('@/components/FamilyMemberSetup').then((m) => ({ default: m.default }))
)
const OnboardingFlow = lazy(() =>
  import('@/components/onboarding').then((m) => ({ default: m.OnboardingFlow }))
)

function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [config, setConfig] = useState<ChronosConfig | null>(null)

  useEffect(() => {
    isAuthenticated()
      .then(setAuthenticated)
      .catch(() => setAuthenticated(false))
  }, [])

  useEffect(() => {
    getConfig().then(setConfig)
  }, [])

  if (authenticated === null || config === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
          <span className="text-slate-400">Loading…</span>
        </div>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {!config.onboardingComplete ? (
        <motion.div
          key="onboarding"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-screen"
        >
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-900 dark:bg-slate-950">
              <div className="w-10 h-10 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
            </div>
          }>
          <OnboardingFlow
            config={config}
            authenticated={authenticated ?? false}
            onConfigUpdate={setConfig}
            onComplete={() => getConfig().then(setConfig)}
          />
          </Suspense>
        </motion.div>
      ) : !authenticated ? (
        <LoginScreen key="login" onSuccess={() => setAuthenticated(true)} />
      ) : (
        <motion.div
          key="main-app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-screen"
        >
          <AuthenticatedApp
            config={config}
            onConfigUpdate={setConfig}
            onLogout={() => setAuthenticated(false)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function AuthenticatedApp({
  config,
  onConfigUpdate,
  onLogout,
}: {
  config: ChronosConfig
  onConfigUpdate: (config: ChronosConfig) => void
  onLogout: () => void
}) {
  if (!config.familySetupComplete) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900 dark:bg-slate-950">
          <div className="w-10 h-10 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
        </div>
      }>
        <FamilyMemberSetup
          onComplete={() => getConfig().then(onConfigUpdate)}
        />
      </Suspense>
    )
  }

  return <MainLayout onLogout={onLogout} />
}

export default App
