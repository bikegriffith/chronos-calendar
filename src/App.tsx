import { useState, useEffect } from 'react'
import { isAuthenticated } from '@/services/googleAuth'
import { getConfig } from '@/services/configService'
import type { ChronosConfig } from '@shared/types'
import LoginScreen from '@/components/LoginScreen'
import FamilyMemberSetup from '@/components/FamilyMemberSetup'
import MainLayout from '@/components/MainLayout'

function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    isAuthenticated()
      .then(setAuthenticated)
      .catch(() => setAuthenticated(false))
  }, [])

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Loading…</div>
      </div>
    )
  }

  if (!authenticated) {
    return <LoginScreen onSuccess={() => setAuthenticated(true)} />
  }

  return <AuthenticatedApp onLogout={() => setAuthenticated(false)} />
}

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  const [config, setConfig] = useState<ChronosConfig | null>(null)

  useEffect(() => {
    getConfig().then(setConfig)
  }, [])

  if (config === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-dark-950">
        <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!config.familySetupComplete) {
    return <FamilyMemberSetup onComplete={() => getConfig().then(setConfig)} />
  }

  return <MainLayout onLogout={onLogout} />
}

export default App
