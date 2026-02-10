/**
 * Keyword → emoji map for calendar event titles (case-insensitive).
 * First match wins; order matters if multiple phrases could match.
 */
const TITLE_EMOJI_MAP: Array<{ phrase: string; emoji: string }> = [
  { phrase: 'gymnastics', emoji: '🤸‍♀️' },
  { phrase: 'baseball', emoji: '⚾' },
  { phrase: 'football', emoji: '🏈' },
  { phrase: 'basketball', emoji: '🏀' },
  { phrase: 'flight', emoji: '✈️' },
  { phrase: 'airport', emoji: '✈️' },
];

/**
 * Returns an emoji for the event icon when the title contains a known phrase,
 * otherwise null (caller should show initial/avatar).
 */
export function getEventTitleEmoji(title: string): string | null {
  if (!title || typeof title !== 'string') return null;
  const lower = title.toLowerCase();
  for (const { phrase, emoji } of TITLE_EMOJI_MAP) {
    if (lower.includes(phrase)) return emoji;
  }
  return null;
}
