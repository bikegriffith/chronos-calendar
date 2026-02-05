import { useState } from 'react';
import { motion } from 'framer-motion';
import { APP_NAME } from '@shared/constants';
import { login } from '../services/googleAuth';

function GoogleLogoIcon() {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

interface LoginScreenProps {
  onSuccess?: () => void;
}

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    setLoading(true);
    try {
      await login();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Gradient background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #334155 50%, #1e3a5f 75%, #0f172a 100%)',
        }}
      />
      <div
        className="absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59, 130, 246, 0.35), transparent),
            radial-gradient(ellipse 60% 40% at 100% 50%, rgba(30, 58, 95, 0.4), transparent),
            radial-gradient(ellipse 50% 30% at 0% 80%, rgba(51, 65, 85, 0.3), transparent)`,
        }}
      />

      <motion.div
        className="flex flex-col items-center gap-10 px-6 text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold tracking-tight text-white">
            {APP_NAME}
          </h1>
          <p className="text-slate-400 text-lg">Family Calendar</p>
        </motion.div>

        <motion.p
          className="text-slate-300 max-w-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          Connect your Google Calendar to see and manage your events in one
          place.
        </motion.p>

        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <button
            type="button"
            onClick={handleConnect}
            disabled={loading}
            className="flex items-center gap-3 px-6 py-3.5 rounded-xl bg-white text-gray-800 font-medium shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25 hover:bg-gray-50 active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:pointer-events-none"
          >
            <GoogleLogoIcon />
            <span>
              {loading ? 'Connecting…' : 'Connect Google Calendar'}
            </span>
          </button>
          {error && (
            <p className="text-sm text-red-400 max-w-xs" role="alert">
              {error}
            </p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
