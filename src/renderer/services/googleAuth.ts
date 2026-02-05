/**
 * Google Calendar OAuth authentication service.
 * Uses Electron's main process for the OAuth flow and secure token storage (electron-store).
 */

function getAPI() {
  if (typeof window === 'undefined' || !window.electronAPI?.googleAuth) {
    throw new Error('Google Auth API is not available (run in Electron).');
  }
  return window.electronAPI.googleAuth;
}

/**
 * Start the OAuth flow: opens a BrowserWindow to Google sign-in,
 * then stores tokens securely in the main process.
 */
export async function login(): Promise<void> {
  await getAPI().login();
}

/**
 * Clear stored tokens and sign out.
 */
export async function logout(): Promise<void> {
  await getAPI().logout();
}

/**
 * Returns true if we have stored tokens (user has connected Google Calendar).
 */
export async function isAuthenticated(): Promise<boolean> {
  return getAPI().isAuthenticated();
}

/**
 * Returns a valid access token for Google API calls.
 * The main process refreshes the token automatically if expired.
 * Returns null if not authenticated or refresh fails.
 */
export async function getAccessToken(): Promise<string | null> {
  return getAPI().getAccessToken();
}
