import { useState, useEffect } from 'react';
import { isAuthenticated } from './services/googleAuth';
import LoginScreen from './components/LoginScreen';
import MainLayout from './components/MainLayout';

function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    isAuthenticated()
      .then(setAuthenticated)
      .catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Loading…</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <LoginScreen onSuccess={() => setAuthenticated(true)} />
    );
  }

  return <MainLayout />;
}

export default App;
