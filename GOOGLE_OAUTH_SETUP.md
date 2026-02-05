# Google Calendar OAuth 2.0 Setup Guide

This guide walks you through setting up Google Cloud credentials so Chronos can access Google Calendar on your behalf.

## 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top, then **New Project**.
3. Enter a project name (e.g. "Chronos Calendar") and click **Create**.
4. Select the new project from the dropdown so it’s the active project.

## 2. Enable the Google Calendar API

1. In the left sidebar, go to **APIs & Services** → **Library**.
2. Search for **Google Calendar API**.
3. Open **Google Calendar API** and click **Enable**.

## 3. Create OAuth 2.0 Credentials (Desktop App)

1. Go to **APIs & Services** → **Credentials**.
2. Click **Create Credentials** → **OAuth client ID**.
3. If prompted, configure the **OAuth consent screen**:
   - Choose **External** (or **Internal** for a Google Workspace org).
   - Fill in **App name** (e.g. "Chronos"), **User support email**, and **Developer contact**.
   - Add the **Google Calendar** scope: `https://www.googleapis.com/auth/calendar` (and optionally `.../calendar.readonly`).
   - Save the consent screen.
4. Back under **Credentials**, click **Create Credentials** → **OAuth client ID** again.
5. Set **Application type** to **Desktop app**.
6. Give it a name (e.g. "Chronos Desktop") and click **Create**.
7. In the dialog, click **Download JSON** to download the client configuration.

## 4. Download and Store credentials.json

1. Rename the downloaded file to **`credentials.json`** (if it isn’t already).
2. Place it in the correct location for your environment:
   - **Development:** Put `credentials.json` in the **project root** (the same folder as `package.json`).
   - **Production:** Put `credentials.json` in the app’s user data directory:
     - **macOS:** `~/Library/Application Support/Chronos/credentials.json`
     - **Windows:** `%APPDATA%\Chronos\credentials.json`
     - **Linux:** `~/.config/Chronos/credentials.json`
3. **Important:** Add `credentials.json` to `.gitignore` so it is never committed. Chronos already ignores it.

## 5. Redirect URI (Desktop App)

For **Desktop app** credentials, Google allows the redirect URI **`http://localhost`**. Chronos runs a temporary local server on a port (e.g. `http://localhost:3456/callback`) during login. You do **not** need to add this exact URL in the Cloud Console when using **Desktop app** type; `http://localhost` is accepted for any port.

If you use **Web application** credentials instead, add the exact callback URL (e.g. `http://localhost:3456/callback`) to **Authorized redirect URIs** in the OAuth client.

## 5b. Optional: Sign in from Chrome (for voice input testing)

The Web Speech API does not work inside Electron, but it works in Chrome. To sign in when running the app in Chrome at `http://localhost:5173` (e.g. to test voice input):

1. In **APIs & Services** → **Credentials**, click **Create Credentials** → **OAuth client ID**.
2. Set **Application type** to **Web application**.
3. Name it (e.g. "Chronos Web (localhost)").
4. Under **Authorized JavaScript origins** add: `http://localhost:5173`
5. Under **Authorized redirect URIs** add: `http://localhost:5173/callback`
6. Click **Create** and copy the **Client ID** and **Client secret**.
7. In the **project root** (the folder that contains `package.json`), create a file **`.env.local`** (it is gitignored). Put exactly these two lines (no quotes around the values):
   ```
   VITE_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
   VITE_GOOGLE_WEB_CLIENT_SECRET=your-web-client-secret
   ```
8. **Restart the dev server** (stop it and run `npm run dev` again). Then open **Chrome** and go to **http://localhost:5173**. Click **Connect Google Calendar**; you’ll be redirected to Google and back to the app after signing in. Voice input will work there.

## 6. Run Chronos and Connect

1. Start the app (`npm run dev`).
2. Click **Connect Google Calendar** on the login screen.
3. Sign in with your Google account and approve access to Google Calendar.
4. After redirect, you can close the browser tab/window; Chronos will store tokens and use them for calendar access.

## Troubleshooting

- **"credentials.json not found"**  
  Ensure `credentials.json` is in the project root (dev) or in the Chronos user data directory (prod), and that the file name is exactly `credentials.json`.

- **"Redirect URI mismatch"**  
  Use **Desktop app** credentials. If you use **Web application**, add `http://localhost:3456/callback` (or the port shown in the error) to Authorized redirect URIs.

- **"Access blocked: This app's request is invalid"**  
  Finish configuring the OAuth consent screen (scopes and test users if the app is in Testing mode).

- **Scopes**  
  For full calendar access, ensure the consent screen includes the scope:  
  `https://www.googleapis.com/auth/calendar`

- **"Google Auth is not available" in Chrome**  
  Ensure `.env.local` is in the **project root** (same folder as `package.json`). Variable names must be exactly `VITE_GOOGLE_WEB_CLIENT_ID` and `VITE_GOOGLE_WEB_CLIENT_SECRET`. Use no quotes; restart the dev server after creating or editing `.env.local`.
