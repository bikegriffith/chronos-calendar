/**
 * Google Calendar OAuth authentication.
 * - In Electron: uses main process (OAuth window + electron-store).
 * - In browser (e.g. Chrome at localhost:5173): uses Web client + localStorage.
 */

import * as browserAuth from './googleAuthBrowser';

function getElectronAPI() {
  if (typeof window === 'undefined' || !(window as Window & { electronAPI?: { googleAuth?: unknown } }).electronAPI?.googleAuth) {
    return null;
  }
  return (window as Window & { electronAPI: { googleAuth: {
    login: () => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: () => Promise<boolean>;
    getAccessToken: () => Promise<string | null>;
  } } }).electronAPI.googleAuth;
}

/**
 * Start the OAuth flow. In Electron opens a window; in browser redirects to Google.
 */
export async function login(): Promise<void> {
  const electron = getElectronAPI();
  if (electron) {
    await electron.login();
    return;
  }
  if (browserAuth.isBrowserAuthConfigured()) {
    window.location.href = browserAuth.buildLoginUrl();
    return;
  }
  const hint = browserAuth.getBrowserAuthConfigError();
  throw new Error(
    hint ??
    'Google Auth is not available. Add VITE_GOOGLE_WEB_CLIENT_ID and VITE_GOOGLE_WEB_CLIENT_SECRET to .env.local in the project root (same folder as package.json). Restart the dev server (see GOOGLE_OAUTH_SETUP.md).'
  );
}

/**
 * Clear stored tokens and sign out.
 */
export async function logout(): Promise<void> {
  const electron = getElectronAPI();
  if (electron) {
    await electron.logout();
    return;
  }
  browserAuth.logout();
}

/**
 * Returns true if we have stored tokens (user has connected Google Calendar).
 */
export async function isAuthenticated(): Promise<boolean> {
  const electron = getElectronAPI();
  if (electron) {
    return electron.isAuthenticated();
  }
  return browserAuth.isAuthenticated();
}

/**
 * Returns a valid access token for Google API calls. Refreshes automatically if expired.
 */
export async function getAccessToken(): Promise<string | null> {
  const electron = getElectronAPI();
  if (electron) {
    return electron.getAccessToken();
  }
  return browserAuth.getAccessToken();
}

/** For callback handling: exchange code and persist tokens. */
export { exchangeCodeForTokens, isBrowserAuthConfigured } from './googleAuthBrowser';
