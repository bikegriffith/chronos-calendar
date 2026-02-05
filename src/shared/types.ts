// Shared types for the Chronos calendar app

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  color?: string;
  category?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  color: string;
  /** Emoji used as avatar (e.g. "👩", "🧑") */
  avatar?: string;
  /** Google Calendar IDs this member's events come from */
  calendarIds: string[];
}

export interface AppSettings {
  /** Theme id from ChronosTheme (e.g. 'light-sky', 'dark-midnight'). Replaces darkMode. */
  theme?: string;
  /** @deprecated Use theme instead. Kept for migration. */
  darkMode?: boolean;
  voiceLanguage: string;
}

/** Onboarding step: 0=Welcome, 1=Connect Google, 2=Family, 3=Voice, 4=Finish */
export type OnboardingStep = 0 | 1 | 2 | 3 | 4;

export interface ChronosConfig {
  familyMembers: FamilyMember[];
  familySetupComplete: boolean;
  settings: AppSettings;
  /** When true, first-run onboarding is done; user goes straight to app. */
  onboardingComplete?: boolean;
  /** Current step in first-run onboarding (0–4). Only relevant when !onboardingComplete. */
  onboardingStep?: OnboardingStep;
}

export interface CalendarView {
  type: 'month' | 'week' | 'day';
  date: Date;
}
