import { app, BrowserWindow, ipcMain } from 'electron';
import * as http from 'http';
import * as path from 'path';
import * as url from 'url';
import Store from 'electron-store';

const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');
const CALLBACK_PATH = '/callback';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const CALLBACK_PORT = 3456;

interface Credentials {
  installed?: {
    client_id: string;
    client_secret: string;
    redirect_uris?: string[];
  };
  web?: {
    client_id: string;
    client_secret: string;
    redirect_uris?: string[];
  };
}

interface TokenSet {
  access_token: string;
  refresh_token?: string;
  expiry_date: number;
  scope?: string;
}

const store = new Store<{ tokens?: TokenSet }>({ name: 'google-auth' });

function getCredentialsPath(): string {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    return path.join(process.cwd(), 'credentials.json');
  }
  return path.join(app.getPath('userData'), 'credentials.json');
}

function loadCredentials(): { clientId: string; clientSecret: string } {
  const fs = require('fs');
  const credPath = getCredentialsPath();
  if (!fs.existsSync(credPath)) {
    throw new Error(
      `credentials.json not found at ${credPath}. See GOOGLE_OAUTH_SETUP.md for setup.`
    );
  }
  const raw = fs.readFileSync(credPath, 'utf-8');
  const cred: Credentials = JSON.parse(raw);
  const client = cred.installed ?? cred.web;
  if (!client?.client_id || !client.client_secret) {
    throw new Error(
      'credentials.json must contain client_id and client_secret (installed or web).'
    );
  }
  return { clientId: client.client_id, clientSecret: client.client_secret };
}

function createCallbackServer(
  port: number
): {
  redirectUri: string;
  promise: Promise<string>;
  server: http.Server;
} {
  let resolveCode: (code: string) => void;
  let rejectCode: (err: Error) => void;
  const promise = new Promise<string>((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });
  const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url ?? '', true);
    if (parsed.pathname !== CALLBACK_PATH) {
      res.writeHead(404);
      res.end();
      return;
    }
    const code = parsed.query?.code as string | undefined;
    const error = parsed.query?.error as string | undefined;
    const headers: Record<string, string> = {
      'Content-Type': 'text/html; charset=utf-8',
    };
    if (error) {
      res.writeHead(400, headers);
      res.end(
        `<html><body><h1>Authorization failed</h1><p>Error: ${error}</p><p>You can close this window.</p></body></html>`
      );
      rejectCode(new Error(error));
      return;
    }
    if (!code) {
      res.writeHead(400, headers);
      res.end(
        '<html><body><h1>Missing code</h1><p>You can close this window.</p></body></html>'
      );
      rejectCode(new Error('Missing authorization code'));
      return;
    }
    res.writeHead(200, headers);
    res.end(
      '<html><body><h1>Success!</h1><p>You can close this window and return to Chronos.</p></body></html>'
    );
    resolveCode(code);
  });
  server.listen(port, '127.0.0.1');
  const redirectUri = `http://localhost:${port}${CALLBACK_PATH}`;
  return { redirectUri, promise, server };
}

function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<TokenSet> {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString();
    const https = require('https');
    const req = https.request(
      TOKEN_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res: import('http').IncomingMessage) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(json.error_description || json.error));
              return;
            }
            const expiryDate = Date.now() + (json.expires_in ?? 3600) * 1000;
            resolve({
              access_token: json.access_token,
              refresh_token: json.refresh_token,
              expiry_date: expiryDate,
              scope: json.scope,
            });
          } catch {
            reject(new Error('Invalid token response'));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<TokenSet> {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }).toString();
    const https = require('https');
    const req = https.request(
      TOKEN_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res: import('http').IncomingMessage) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(json.error_description || json.error));
              return;
            }
            const expiryDate = Date.now() + (json.expires_in ?? 3600) * 1000;
            const existing = store.get('tokens');
            resolve({
              access_token: json.access_token,
              refresh_token: existing?.refresh_token ?? refreshToken,
              expiry_date: expiryDate,
              scope: json.scope ?? existing?.scope,
            });
          } catch {
            reject(new Error('Invalid token response'));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export function registerGoogleAuthHandlers(): void {
  ipcMain.handle('google-auth:login', async () => {
    const { clientId, clientSecret } = loadCredentials();
    const { redirectUri, promise: codePromise, server } =
      createCallbackServer(CALLBACK_PORT);
    const authUrl =
      `${AUTH_URL}?` +
      new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: OAUTH_SCOPES,
        access_type: 'offline',
        prompt: 'consent',
      }).toString();

    const oauthWindow = new BrowserWindow({
      width: 500,
      height: 700,
      show: false,
      parent: BrowserWindow.getFocusedWindow() ?? undefined,
      modal: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });
    oauthWindow.once('ready-to-show', () => oauthWindow.show());
    oauthWindow.loadURL(authUrl);

    try {
      const code = await codePromise;
      server.close();
      oauthWindow.close();
      const tokens = await exchangeCodeForTokens(
        code,
        redirectUri,
        clientId,
        clientSecret
      );
      store.set('tokens', tokens);
      return { success: true };
    } catch (err) {
      server.close();
      oauthWindow.close();
      throw err;
    }
  });

  ipcMain.handle('google-auth:logout', () => {
    store.delete('tokens');
    return undefined;
  });

  ipcMain.handle('google-auth:isAuthenticated', (): boolean => {
    const tokens = store.get('tokens');
    return Boolean(tokens?.access_token);
  });

  ipcMain.handle(
    'google-auth:getAccessToken',
    async (): Promise<string | null> => {
      let tokens = store.get('tokens');
      if (!tokens?.access_token) return null;
      const bufferMs = 5 * 60 * 1000;
      if (
        tokens.expiry_date <= Date.now() + bufferMs &&
        tokens.refresh_token
      ) {
        try {
          const { clientId, clientSecret } = loadCredentials();
          tokens = await refreshAccessToken(
            clientId,
            clientSecret,
            tokens.refresh_token
          );
          store.set('tokens', tokens);
        } catch {
          return null;
        }
      }
      return tokens.access_token;
    }
  );
}
