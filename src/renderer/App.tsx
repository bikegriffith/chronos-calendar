import { useState, useEffect } from 'react';
import { isAuthenticated, exchangeCodeForTokens, isBrowserAuthConfigured } from './services/googleAuth';
import { getConfig } from './services/configService';
import type { ChronosConfig } from '@shared/types';
import LoginScreen from './components/LoginScreen';
import FamilyMemberSetup from './components/FamilyMemberSetup';
import MainLayout from './components/MainLayout';

function getCodeFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('code');
}

function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [callbackStatus, setCallbackStatus] = useState<'idle' | 'exchanging' | 'done' | 'error'>('idle');

  // Handle OAuth callback when opened in browser (e.g. Chrome) after Google redirect
  useEffect(() => {
    const code = getCodeFromUrl();
    if (!code || !isBrowserAuthConfigured()) {
      setCallbackStatus('done');
      return;
    }
    setCallbackStatus('exchanging');
    exchangeCodeForTokens(code)
      .then(() => {
        setCallbackStatus('done');
        window.history.replaceState({}, '', window.location.pathname.replace(/\/callback\/?$/, '') || '/');
        setAuthenticated(true);
      })
      .catch(() => setCallbackStatus('error'));
  }, []);

  useEffect(() => {
    if (callbackStatus !== 'done') return;
    isAuthenticated()
      .then(setAuthenticated)
      .catch(() => setAuthenticated(false));
  }, [callbackStatus]);

  if (authenticated === null || callbackStatus === 'exchanging') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">
          {callbackStatus === 'exchanging' ? 'Completing sign-in…' : 'Loading…'}
        </div>
      </div>
    );
  }

  if (callbackStatus === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-900 px-4">
        <p className="text-slate-300 text-center">Sign-in failed. You can close this and try again.</p>
        <button
          type="button"
          onClick={() => {
            setCallbackStatus('done');
            window.history.replaceState({}, '', '/');
          }}
          className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600"
        >
          Back to app
        </button>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <LoginScreen onSuccess={() => setAuthenticated(true)} />
    );
  }

  return (
    <AuthenticatedApp
      onLogout={() => setAuthenticated(false)}
    />
  );
}

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  const [config, setConfig] = useState<ChronosConfig | null>(null);

  useEffect(() => {
    getConfig().then(setConfig);
  }, []);

  if (config === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-dark-950">
        <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!config.familySetupComplete) {
    return (
      <FamilyMemberSetup
        onComplete={() => getConfig().then(setConfig)}
      />
    );
  }

  return <MainLayout onLogout={onLogout} />;
}

export default App;
