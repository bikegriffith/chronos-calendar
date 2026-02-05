/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    googleAuth: {
      login: () => Promise<void>;
      logout: () => Promise<void>;
      isAuthenticated: () => Promise<boolean>;
      getAccessToken: () => Promise<string | null>;
    };
  };
}
