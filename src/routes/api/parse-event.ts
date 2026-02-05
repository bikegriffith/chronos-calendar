/**
 * Server API route: proxy Claude/Anthropic for parsing voice transcription to a calendar event.
 * Keeps ANTHROPIC_API_KEY server-side to avoid CORS and key exposure.
 */
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

const CLAUDE_URL = 'https://api.anthropic.com/v1/messages'

function isValidIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
}

function isValidTime(s: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(s)
}

function stripMarkdownFences(text: string): string {
  let s = text.trim()
  const backtick = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/
  const m = s.match(backtick)
  if (m) s = m[1]!.trim()
  return s
}

function validateAndNormalize(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const title = o.title
  if (typeof title !== 'string' || !title.trim()) return null
  const startDate = o.startDate
  if (typeof startDate !== 'string' || !isValidIsoDate(startDate)) return null
  const startTime =
    o.startTime === null || o.startTime === undefined
      ? null
      : typeof o.startTime === 'string' && (o.startTime === '' || isValidTime(o.startTime))
        ? o.startTime === ''
          ? null
          : o.startTime
        : null
  const endTime =
    o.endTime === null || o.endTime === undefined
      ? null
      : typeof o.endTime === 'string' && (o.endTime === '' || isValidTime(o.endTime))
        ? o.endTime === ''
          ? null
          : o.endTime
        : null
  const duration =
    o.duration === null || o.duration === undefined
      ? null
      : typeof o.duration === 'number' && Number.isInteger(o.duration) && o.duration >= 0
        ? o.duration
        : null
  const attendee =
    o.attendee === null || o.attendee === undefined
      ? null
      : typeof o.attendee === 'string' && o.attendee.trim()
        ? o.attendee.trim()
        : null
  const notes =
    o.notes === null || o.notes === undefined
      ? null
      : typeof o.notes === 'string'
        ? o.notes.trim() || null
        : null
  return {
    title: (title as string).trim(),
    startDate,
    startTime: startTime,
    endTime: endTime,
    durationMinutes: duration,
    attendee: attendee,
    notes: notes,
  }
}

export const Route = createFileRoute('/api/parse-event')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
          return json(
            { error: 'ANTHROPIC_API_KEY is not configured on the server.' },
            { status: 500 }
          )
        }
        let body: { transcription?: string }
        try {
          body = await request.json()
        } catch {
          return json({ error: 'Invalid JSON body' }, { status: 400 })
        }
        const transcription = typeof body?.transcription === 'string' ? body.transcription.trim() : ''
        if (!transcription) {
          return json({ error: 'Missing or empty transcription' }, { status: 400 })
        }
        const currentDate = new Date().toISOString().slice(0, 10)
        const escaped = transcription.replace(/'/g, "\\'")
        const prompt = `Parse this into a calendar event. Today is ${currentDate}.
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
}`
        const model = process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-20250514'
        try {
          const res = await fetch(CLAUDE_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model,
              max_tokens: 512,
              messages: [{ role: 'user', content: prompt }],
            }),
          })
          const data = (await res.json()) as {
            content?: Array<{ type: string; text?: string }>
            error?: { message?: string }
          }
          if (!res.ok) {
            const message = data.error?.message || `Claude API error: ${res.status}`
            return json({ error: message }, { status: res.status >= 500 ? 502 : 400 })
          }
          const text = data.content?.find((c) => c.type === 'text')?.text?.trim() ?? ''
          if (!text) return json({ error: 'Empty response from Claude' }, { status: 502 })
          let parsed: unknown
          try {
            parsed = JSON.parse(stripMarkdownFences(text))
          } catch {
            return json({ error: 'Invalid JSON from Claude' }, { status: 502 })
          }
          const normalized = validateAndNormalize(parsed)
          if (!normalized) return json({ error: 'Claude response did not match expected shape' }, { status: 502 })
          return json(normalized)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to call Claude'
          return json({ error: message }, { status: 502 })
        }
      },
    },
  },
})
