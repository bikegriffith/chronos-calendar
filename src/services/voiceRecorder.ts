/**
 * VoiceRecorder — Web Speech API (SpeechRecognition) service.
 * Handles microphone permissions, real-time transcription, and start/stop recording.
 */

interface SpeechRecognitionErrorEvent extends Event {
  error: 'aborted' | 'audio-capture' | 'network' | 'no-speech' | 'not-allowed' | 'service-not-allowed'
  message?: string
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onend: ((e: Event) => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
  onaudiostart: ((e: Event) => void) | null
  onaudioend: ((e: Event) => void) | null
  onsoundstart: ((e: Event) => void) | null
  onsoundend: ((e: Event) => void) | null
  onspeechstart: ((e: Event) => void) | null
  onspeechend: ((e: Event) => void) | null
  onstart: ((e: Event) => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition
    webkitSpeechRecognition?: new () => ISpeechRecognition
  }
}

export type VoiceRecorderState = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported'

export interface VoiceRecorderCallbacks {
  onStateChange?: (state: VoiceRecorderState) => void
  onTranscript?: (text: string, isFinal: boolean) => void
  onResult?: (fullText: string) => void
  onError?: (message: string) => void
}

export interface VoiceRecorderOptions {
  lang?: string
}

const SpeechRecognitionCtor =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined

/** Check if the Web Speech API (SpeechRecognition) is available. */
export function isSpeechRecognitionSupported(): boolean {
  return Boolean(SpeechRecognitionCtor)
}

/** Voice input is available when the browser supports SpeechRecognition. */
export function isVoiceInputAvailable(): boolean {
  return isSpeechRecognitionSupported()
}

export async function requestMicrophonePermission(): Promise<boolean> {
  if (typeof navigator?.mediaDevices?.getUserMedia !== 'function') return false
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((t) => t.stop())
    return true
  } catch {
    return false
  }
}

export class VoiceRecorder {
  private recognition: ISpeechRecognition | null = null
  private callbacks: VoiceRecorderCallbacks = {}
  private _state: VoiceRecorderState = 'idle'
  private accumulatedTranscript = ''

  constructor(callbacks: VoiceRecorderCallbacks = {}, options: VoiceRecorderOptions = {}) {
    this.callbacks = callbacks
    if (!SpeechRecognitionCtor) {
      this.setState('unsupported')
      return
    }
    this.recognition = new SpeechRecognitionCtor!()
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = options.lang ?? (typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US')
    this.recognition.maxAlternatives = 1

    this.recognition.onresult = (e: SpeechRecognitionEvent) => {
      let finalText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) {
          finalText += transcript
        }
      }
      if (finalText) {
        this.accumulatedTranscript += (this.accumulatedTranscript ? ' ' : '') + finalText
        this.callbacks.onTranscript?.(this.accumulatedTranscript, true)
        this.callbacks.onResult?.(this.accumulatedTranscript)
      }
    }

    this.recognition.onend = () => {
      if (this._state === 'listening') {
        this.setState('processing')
        this.callbacks.onResult?.(this.accumulatedTranscript)
        setTimeout(() => this.setState('idle'), 500)
      } else {
        this.setState('idle')
      }
    }

    this.recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'aborted' || e.error === 'no-speech') return
      let message: string
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        message = 'Microphone access denied'
      } else if (e.error === 'network') {
        message = 'Speech service unavailable. Check your network connection.'
      } else {
        message = e.message || String(e.error) || 'Recognition error'
      }
      this.callbacks.onError?.(message)
      this.setState('error')
      this.setState('idle')
    }
  }

  private setState(state: VoiceRecorderState) {
    this._state = state
    this.callbacks.onStateChange?.(state)
  }

  get state(): VoiceRecorderState {
    return this._state
  }

  async start(): Promise<void> {
    if (!this.recognition) return
    if (this._state === 'listening') return
    const allowed = await requestMicrophonePermission()
    if (!allowed) {
      this.callbacks.onError?.('Microphone access denied')
      this.setState('error')
      return
    }
    this.accumulatedTranscript = ''
    this.setState('listening')
    this.recognition.start()
  }

  stop(): void {
    if (!this.recognition || this._state !== 'listening') return
    this.recognition.stop()
    this.setState('processing')
  }

  getTranscript(): string {
    return this.accumulatedTranscript
  }

  reset(): void {
    this.accumulatedTranscript = ''
  }
}
