/**
 * AI event parsing: calls server API /api/parse-event to turn voice transcription
 * into a structured ParsedEvent (Claude runs server-side; API key never sent to client).
 */

export interface ParsedEvent {
  title: string
  startDate: string
  startTime: string | null
  endTime: string | null
  durationMinutes: number | null
  attendee: string | null
  notes: string | null
}

export class AIEventParserError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'AIEventParserError'
  }
}

/**
 * Parses voice transcription into a structured calendar event via server API.
 * Server uses ANTHROPIC_API_KEY; no key is exposed to the client.
 */
export async function parseTranscriptionToEvent(transcription: string): Promise<ParsedEvent | null> {
  const trimmed = transcription?.trim()
  if (!trimmed) return null

  try {
    const res = await fetch('/api/parse-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcription: trimmed }),
    })
    const data = await res.json()

    if (!res.ok) {
      const message = data?.error ?? `Request failed: ${res.status}`
      throw new AIEventParserError(message)
    }

    if (data?.error) {
      throw new AIEventParserError(data.error)
    }

    return data as ParsedEvent
  } catch (err) {
    if (err instanceof AIEventParserError) throw err
    throw new AIEventParserError(
      err instanceof Error ? err.message : 'Failed to parse event with AI',
      err
    )
  }
}

/**
 * Converts a ParsedEvent into NewEventInput for the calendar API.
 */
export function parsedEventToNewEventInput(parsed: ParsedEvent): {
  summary: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  description?: string
} {
  const date = parsed.startDate
  const allDay = parsed.startTime == null && parsed.endTime == null

  if (allDay) {
    return {
      summary: parsed.title,
      start: { date },
      end: { date },
      ...(parsed.notes && { description: parsed.notes }),
    }
  }

  const startTime = parsed.startTime ?? '09:00'
  let endTime = parsed.endTime
  if (endTime == null && parsed.durationMinutes != null) {
    const [sh, sm] = startTime.split(':').map(Number)
    const endM = sh * 60 + sm + parsed.durationMinutes
    const eh = Math.floor(endM / 60) % 24
    const em = endM % 60
    endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
  }
  if (endTime == null) {
    endTime = parsed.startTime ?? '09:00'
  }

  const startDateTime = `${date}T${startTime}:00`
  const endDateTime = `${date}T${endTime}:00`

  return {
    summary: parsed.title,
    start: { dateTime: startDateTime },
    end: { dateTime: endDateTime },
    ...(parsed.notes && { description: parsed.notes }),
  }
}
