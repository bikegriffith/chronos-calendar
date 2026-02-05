/**
 * Google OAuth for the browser (Chrome at localhost:5173).
 * Use when running outside Electron so you can test voice input.
 * Requires a "Web application" OAuth client with:
 *   - Authorized JavaScript origins: http://localhost:5173
 *   - Authorized redirect URIs: http://localhost:5173/callback
 * Set VITE_GOOGLE_WEB_CLIENT_ID and VITE_GOOGLE_WEB_CLIENT_SECRET in .env.local
 */

const STORAGE_KEY = 'chronos-google-tokens';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES =
  'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';

interface TokenSet {
  access_token: string;
  refresh_token?: string;
  expiry_date: number;
}

function getClientConfig(): { clientId: string; clientSecret: string } | null {
  const id = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID;
  const secret = import.meta.env.VITE_GOOGLE_WEB_CLIENT_SECRET;
  if (typeof id === 'string' && id.length > 0 && typeof secret === 'string' && secret.length > 0) {
    return { clientId: id, clientSecret: secret };
  }
  return null;
}

function getRedirectUri(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  return `${origin}/callback`;
}

export function isBrowserAuthConfigured(): boolean {
  return getClientConfig() !== null;
}

/** Call this for a clearer error when env vars are missing. */
export function getBrowserAuthConfigError(): string | null {
  const id = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID;
  const secret = import.meta.env.VITE_GOOGLE_WEB_CLIENT_SECRET;
  if (typeof id !== 'string' || id.length === 0) {
    return 'VITE_GOOGLE_WEB_CLIENT_ID is missing or empty in .env.local (in the project root, same folder as package.json). Restart the dev server after adding it.';
  }
  if (typeof secret !== 'string' || secret.length === 0) {
    return 'VITE_GOOGLE_WEB_CLIENT_SECRET is missing or empty in .env.local. Restart the dev server after adding it.';
  }
  return null;
}

export function buildLoginUrl(): string {
  const config = getClientConfig();
  const err = getBrowserAuthConfigError();
  if (!config) {
    throw new Error(
      err ??
      'Web OAuth not configured. Add VITE_GOOGLE_WEB_CLIENT_ID and VITE_GOOGLE_WEB_CLIENT_SECRET to .env.local in the project root (see GOOGLE_OAUTH_SETUP.md). Restart the dev server.'
    );
  }
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `${AUTH_URL}?${params.toString()}`;
}

function getStoredTokens(): TokenSet | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as TokenSet;
    if (data?.access_token) return data;
  } catch {
    // ignore
  }
  return null;
}

function setStoredTokens(tokens: TokenSet): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

function clearStoredTokens(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function exchangeCodeForTokens(code: string): Promise<void> {
  const config = getClientConfig();
  if (!config) throw new Error('Web OAuth not configured.');
  const redirectUri = getRedirectUri();
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  }).toString();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error_description || json.error);
  }
  const expiryDate = Date.now() + (json.expires_in ?? 3600) * 1000;
  setStoredTokens({
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expiry_date: expiryDate,
  });
}

async function refreshStoredTokens(): Promise<TokenSet> {
  const config = getClientConfig();
  const current = getStoredTokens();
  if (!config || !current?.refresh_token) {
    throw new Error('Cannot refresh: no config or refresh token');
  }
  const body = new URLSearchParams({
    refresh_token: current.refresh_token,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
  }).toString();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json();
  if (json.error) {
    clearStoredTokens();
    throw new Error(json.error_description || json.error);
  }
  const expiryDate = Date.now() + (json.expires_in ?? 3600) * 1000;
  const tokens: TokenSet = {
    access_token: json.access_token,
    refresh_token: current.refresh_token,
    expiry_date: expiryDate,
  };
  setStoredTokens(tokens);
  return tokens;
}

export async function isAuthenticated(): Promise<boolean> {
  const t = getStoredTokens();
  return Boolean(t?.access_token);
}

const BUFFER_MS = 5 * 60 * 1000;

export async function getAccessToken(): Promise<string | null> {
  let tokens = getStoredTokens();
  if (!tokens?.access_token) return null;
  if (tokens.expiry_date <= Date.now() + BUFFER_MS && tokens.refresh_token) {
    try {
      tokens = await refreshStoredTokens();
    } catch {
      return null;
    }
  }
  return tokens.access_token;
}

export function logout(): void {
  clearStoredTokens();
}
