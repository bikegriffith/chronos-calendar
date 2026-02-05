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
  avatar?: string;
}

export interface CalendarView {
  type: 'month' | 'week' | 'day';
  date: Date;
}
