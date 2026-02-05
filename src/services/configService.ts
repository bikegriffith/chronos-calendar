/**
 * App config: family members, setup completion, settings.
 * Persisted in localStorage.
 */

import type { ChronosConfig, FamilyMember, AppSettings } from '@shared/types'

const STORAGE_KEY = 'chronos-config'

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light-sky',
  voiceLanguage: typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US',
}

const DEFAULT_CONFIG: ChronosConfig = {
  familyMembers: [],
  familySetupComplete: false,
  settings: DEFAULT_SETTINGS,
}

function mergeConfig(partial: Partial<ChronosConfig> | null): ChronosConfig {
  if (!partial || typeof partial !== 'object') return DEFAULT_CONFIG
  const rawMembers = Array.isArray(partial.familyMembers) ? partial.familyMembers : DEFAULT_CONFIG.familyMembers
  const rawSettings: Partial<AppSettings> =
    partial.settings && typeof partial.settings === 'object' ? partial.settings : {}
  const theme =
    rawSettings.theme ??
    (rawSettings.darkMode === true ? 'dark-midnight' : rawSettings.darkMode === false ? 'light-sky' : undefined) ??
    DEFAULT_SETTINGS.theme
  return {
    familyMembers: rawMembers.map(normalizeFamilyMember),
    familySetupComplete: Boolean(partial.familySetupComplete),
    settings: {
      ...DEFAULT_SETTINGS,
      ...rawSettings,
      theme,
    },
  }
}

/** Load full config from localStorage. */
export async function getConfig(): Promise<ChronosConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<ChronosConfig>) : null
    return mergeConfig(parsed)
  } catch {
    return DEFAULT_CONFIG
  }
}

/** Save config (partial merge). Returns the full config after save. */
export async function setConfig(updates: Partial<ChronosConfig>): Promise<ChronosConfig> {
  const current = await getConfig()
  const next: ChronosConfig = {
    familyMembers: updates.familyMembers ?? current.familyMembers,
    familySetupComplete: updates.familySetupComplete ?? current.familySetupComplete,
    settings: updates.settings ? { ...current.settings, ...updates.settings } : current.settings,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
  return next
}

/** Ensure legacy FamilyMember objects have calendarIds array. */
export function normalizeFamilyMember(m: FamilyMember): FamilyMember {
  return {
    ...m,
    calendarIds: Array.isArray(m.calendarIds) ? m.calendarIds : [],
  }
}
