import { useState, useEffect } from 'react';
import { APP_NAME } from '@shared/constants';
import { isAuthenticated } from './services/googleAuth';
import LoginScreen from './components/LoginScreen';

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">{APP_NAME}</h1>
          <p className="text-gray-600 mt-2">Family Calendar App</p>
        </header>

        <main className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <p className="text-lg text-gray-700 mb-4">
              Welcome to {APP_NAME}! Your family calendar is ready.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
