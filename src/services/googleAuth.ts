/**
 * Google Calendar OAuth authentication (browser: Web client + localStorage).
 */

import * as browserAuth from './googleAuthBrowser'

/** Start the OAuth flow (redirects to Google). */
export async function login(): Promise<void> {
  if (browserAuth.isBrowserAuthConfigured()) {
    window.location.href = browserAuth.buildLoginUrl()
    return
  }
  const hint = browserAuth.getBrowserAuthConfigError()
  throw new Error(
    hint ??
      'Google Auth is not available. Add VITE_GOOGLE_WEB_CLIENT_ID and VITE_GOOGLE_WEB_CLIENT_SECRET to .env.local. See GOOGLE_OAUTH_SETUP.md.'
  )
}

/** Clear stored tokens and sign out. */
export async function logout(): Promise<void> {
  browserAuth.logout()
}

/** Returns true if we have stored tokens. */
export async function isAuthenticated(): Promise<boolean> {
  return browserAuth.isAuthenticated()
}

/** Returns a valid access token for Google API calls. */
export async function getAccessToken(): Promise<string | null> {
  return browserAuth.getAccessToken()
}

export { exchangeCodeForTokens, isBrowserAuthConfigured } from './googleAuthBrowser'
