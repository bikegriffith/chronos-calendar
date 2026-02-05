/**
 * AI event parsing service.
 * Sends voice transcription to Claude and returns a structured ParsedEvent
 * that can be converted to a calendar event (e.g. NewEventInput).
 *
 * Set VITE_ANTHROPIC_API_KEY in .env.local to use. Restart dev server after adding.
 *
 * In the browser we use a same-origin proxy (/api/anthropic) to avoid CORS;
 * Vite dev server proxies this to api.anthropic.com (see vite.config.ts).
 */

/** Same-origin proxy path in dev (Vite); avoids CORS. Use direct URL in Node (e.g. Electron main). */
const getClaudeApiBase = (): string => {
  if (typeof window === 'undefined') return 'https://api.anthropic.com/v1';
  return '/api/anthropic/v1';
};

/** Model id; override with VITE_ANTHROPIC_MODEL in .env.local. See https://docs.anthropic.com/en/api/models-list */
function getModel(): string {
  const raw = typeof import.meta !== 'undefined' ? (import.meta.env as { VITE_ANTHROPIC_MODEL?: string }).VITE_ANTHROPIC_MODEL : undefined;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return trimmed || 'claude-haiku-4-5';
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw JSON shape returned by Claude (string dates/times). */
export interface ClaudeEventJson {
  title: string;
  startDate: string;
  startTime: string | null;
  endTime: string | null;
  duration: number | null;
  attendee: string | null;
  notes: string | null;
}

/** Normalized parsed event for the app (title, ISO date, times, attendee, notes). */
export interface ParsedEvent {
  title: string;
  startDate: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  attendee: string | null;
  notes: string | null;
}

/** Thrown when the API key is missing or the request fails. */
export class AIEventParserError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'AIEventParserError';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiKey(): string | undefined {
  return import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
}

function getCurrentDateIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildPrompt(currentDate: string, transcription: string): string {
  const escaped = transcription.replace(/'/g, "\\'");
  return `Parse this into a calendar event. Today is ${currentDate}.
Text: '${escaped}'

Return ONLY valid JSON (no markdown):
{
  "title": "event title",
  "startDate": "ISO date (YYYY-MM-DD)",
  "startTime": "HH:mm or null for all-day",
  "endTime": "HH:mm or null",
  "duration": minutes or null,
  "attendee": "family member name or null",
  "notes": "any additional context"
}`;
}

/** Strip markdown code fences so we can parse raw JSON. */
function stripMarkdownFences(text: string): string {
  let s = text.trim();
  const backtick = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/;
  const m = s.match(backtick);
  if (m) s = m[1]!.trim();
  return s;
}

function isValidIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

function isValidTime(s: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(s);
}

/** Validate and normalize Claude's JSON into ParsedEvent. */
function validateAndNormalize(raw: unknown): ParsedEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const title = o.title;
  if (typeof title !== 'string' || !title.trim()) return null;

  const startDate = o.startDate;
  if (typeof startDate !== 'string' || !isValidIsoDate(startDate)) return null;

  const startTime = o.startTime;
  const startTimeVal =
    startTime === null || startTime === undefined
      ? null
      : typeof startTime === 'string' && (startTime === '' || isValidTime(startTime))
        ? (startTime === '' ? null : startTime)
        : null;

  const endTime = o.endTime;
  const endTimeVal =
    endTime === null || endTime === undefined
      ? null
      : typeof endTime === 'string' && (endTime === '' || isValidTime(endTime))
        ? (endTime === '' ? null : endTime)
        : null;

  const duration = o.duration;
  const durationVal =
    duration === null || duration === undefined
      ? null
      : typeof duration === 'number' && Number.isInteger(duration) && duration >= 0
        ? duration
        : null;

  const attendee = o.attendee;
  const attendeeVal =
    attendee === null || attendee === undefined
      ? null
      : typeof attendee === 'string' && attendee.trim()
        ? attendee.trim()
        : null;

  const notes = o.notes;
  const notesVal =
    notes === null || notes === undefined
      ? null
      : typeof notes === 'string' ? notes.trim() || null : null;

  return {
    title: title.trim(),
    startDate,
    startTime: startTimeVal,
    endTime: endTimeVal,
    durationMinutes: durationVal,
    attendee: attendeeVal,
    notes: notesVal,
  };
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * Parses voice transcription into a structured calendar event using Claude.
 * Handles natural language like "Dentist tomorrow at 2pm", "Sarah's soccer Thursday 4 to 6", etc.
 *
 * @param transcription - Raw text from voice input
 * @returns ParsedEvent or null if parsing fails or API is unavailable
 */
export async function parseTranscriptionToEvent(
  transcription: string
): Promise<ParsedEvent | null> {
  const trimmed = transcription?.trim();
  if (!trimmed) {
    return null;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new AIEventParserError(
      'VITE_ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.'
    );
  }

  const currentDate = getCurrentDateIso();
  const prompt = buildPrompt(currentDate, trimmed);

  try {
    const response = await fetch(`${getClaudeApiBase()}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: getModel(),
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      let message = `Claude API error: ${response.status} ${response.statusText}`;
      try {
        const json = JSON.parse(body);
        message = json.error?.message ?? message;
      } catch {
        if (body) message += ` - ${body.slice(0, 200)}`;
      }
      throw new AIEventParserError(message);
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text =
      data.content?.find((c) => c.type === 'text')?.text?.trim() ?? '';
    if (!text) {
      return null;
    }

    const rawJson = stripMarkdownFences(text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      return null;
    }

    return validateAndNormalize(parsed);
  } catch (err) {
    if (err instanceof AIEventParserError) throw err;
    throw new AIEventParserError(
      err instanceof Error ? err.message : 'Failed to parse event with AI',
      err
    );
  }
}

/**
 * Converts a ParsedEvent into NewEventInput for the calendar API.
 * Uses startDate + startTime/endTime or duration; all-day if no times.
 */
export function parsedEventToNewEventInput(parsed: ParsedEvent): {
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
} {
  const date = parsed.startDate;
  const allDay = parsed.startTime == null && parsed.endTime == null;

  if (allDay) {
    return {
      summary: parsed.title,
      start: { date },
      end: { date },
      ...(parsed.notes && { description: parsed.notes }),
    };
  }

  const startTime = parsed.startTime ?? '09:00';
  let endTime = parsed.endTime;
  if (endTime == null && parsed.durationMinutes != null) {
    const [sh, sm] = startTime.split(':').map(Number);
    const endM = sh * 60 + sm + parsed.durationMinutes;
    const eh = Math.floor(endM / 60) % 24;
    const em = endM % 60;
    endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  }
  if (endTime == null) {
    endTime = parsed.startTime ?? '09:00';
  }

  const startDateTime = `${date}T${startTime}:00`;
  const endDateTime = `${date}T${endTime}:00`;

  return {
    summary: parsed.title,
    start: { dateTime: startDateTime },
    end: { dateTime: endDateTime },
    ...(parsed.notes && { description: parsed.notes }),
  };
}
