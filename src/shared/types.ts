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
  darkMode: boolean;
  voiceLanguage: string;
}

export interface ChronosConfig {
  familyMembers: FamilyMember[];
  familySetupComplete: boolean;
  settings: AppSettings;
}

export interface CalendarView {
  type: 'month' | 'week' | 'day';
  date: Date;
}
