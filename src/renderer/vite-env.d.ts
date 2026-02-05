/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    googleAuth: {
      login: () => Promise<void>;
      logout: () => Promise<void>;
      isAuthenticated: () => Promise<boolean>;
      getAccessToken: () => Promise<string | null>;
    };
    store?: {
      getConfig: () => Promise<import('@shared/types').ChronosConfig>;
      setConfig: (updates: Partial<import('@shared/types').ChronosConfig>) => Promise<import('@shared/types').ChronosConfig>;
    };
  };
}
