/**
 * Chronos app config persisted with electron-store.
 * Family members, setup completion, and app settings.
 */

import Store from 'electron-store';
import type { ChronosConfig, FamilyMember, AppSettings } from '@shared/types';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light-sky',
  voiceLanguage: 'en-US',
};

const DEFAULT_CONFIG: ChronosConfig = {
  familyMembers: [],
  familySetupComplete: false,
  settings: DEFAULT_SETTINGS,
};

const store = new Store<ChronosConfig>({ name: 'chronos-config' });

function getFullConfig(): ChronosConfig {
  const partial = store.store as Partial<ChronosConfig>;
  const rawSettings = partial.settings && typeof partial.settings === 'object' ? partial.settings : {};
  // Migrate legacy darkMode to theme
  const theme =
    rawSettings.theme ??
    (rawSettings.darkMode === true ? 'dark-midnight' : rawSettings.darkMode === false ? 'light-sky' : undefined) ??
    DEFAULT_SETTINGS.theme;
  return {
    familyMembers: Array.isArray(partial.familyMembers) ? partial.familyMembers : DEFAULT_CONFIG.familyMembers,
    familySetupComplete: Boolean(partial.familySetupComplete),
    settings: {
      ...DEFAULT_SETTINGS,
      ...rawSettings,
      theme,
    },
  };
}

export function getConfig(): ChronosConfig {
  return getFullConfig();
}

export function setConfig(updates: Partial<ChronosConfig>): ChronosConfig {
  const current = getFullConfig();
  const next: ChronosConfig = {
    familyMembers: updates.familyMembers ?? current.familyMembers,
    familySetupComplete: updates.familySetupComplete ?? current.familySetupComplete,
    settings: updates.settings
      ? { ...current.settings, ...updates.settings }
      : current.settings,
  };
  store.set('familyMembers', next.familyMembers);
  store.set('familySetupComplete', next.familySetupComplete);
  store.set('settings', next.settings);
  return next;
}

export function registerConfigHandlers(ipcMain: import('electron').IpcMain): void {
  ipcMain.handle('chronos-config:get', () => getConfig());
  ipcMain.handle('chronos-config:set', (_event, updates: Partial<ChronosConfig>) =>
    setConfig(updates ?? {})
  );
}
