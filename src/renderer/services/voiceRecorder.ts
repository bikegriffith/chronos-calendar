/**
 * VoiceRecorder — Web Speech API (SpeechRecognition) service.
 * Handles microphone permissions, real-time transcription, and start/stop recording.
 */

// ---------------------------------------------------------------------------
// Web Speech API types (not in all TS DOM libs)
// ---------------------------------------------------------------------------

interface SpeechRecognitionEventMap {
  result: SpeechRecognitionEvent;
  end: Event;
  error: SpeechRecognitionErrorEvent;
  audiostart: Event;
  audioend: Event;
  soundstart: Event;
  soundend: Event;
  speechstart: Event;
  speechend: Event;
  start: Event;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: 'aborted' | 'audio-capture' | 'network' | 'no-speech' | 'not-allowed' | 'service-not-allowed';
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: ((e: Event) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onaudiostart: ((e: Event) => void) | null;
  onaudioend: ((e: Event) => void) | null;
  onsoundstart: ((e: Event) => void) | null;
  onsoundend: ((e: Event) => void) | null;
  onspeechstart: ((e: Event) => void) | null;
  onspeechend: ((e: Event) => void) | null;
  onstart: ((e: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

// ---------------------------------------------------------------------------
// Service state and API
// ---------------------------------------------------------------------------

export type VoiceRecorderState = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported';

export interface VoiceRecorderCallbacks {
  onStateChange?: (state: VoiceRecorderState) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onResult?: (fullText: string) => void;
  onError?: (message: string) => void;
}

const SpeechRecognitionCtor =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;

/**
 * True when running inside Electron. The Web Speech API fails with "network" in Electron
 * because Chromium doesn't include Google's speech service keys.
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && Boolean((window as Window & { electronAPI?: unknown }).electronAPI);
}

/**
 * Check if the Web Speech API (SpeechRecognition) is available in this environment.
 */
export function isSpeechRecognitionSupported(): boolean {
  return Boolean(SpeechRecognitionCtor);
}

/**
 * Voice input is only usable in a real browser (Chrome/Edge). In Electron it always
 * fails with a "network" error, so we treat it as unavailable.
 */
export function isVoiceInputAvailable(): boolean {
  return isSpeechRecognitionSupported() && !isElectron();
}

/**
 * Request microphone permission by starting a minimal MediaStream.
 * Call this before starting recognition for clearer permission UX.
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  if (typeof navigator?.mediaDevices?.getUserMedia !== 'function') {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

/**
 * VoiceRecorder service: start/stop recording and get real-time + final transcription.
 */
export class VoiceRecorder {
  private recognition: ISpeechRecognition | null = null;
  private callbacks: VoiceRecorderCallbacks = {};
  private _state: VoiceRecorderState = 'idle';
  private accumulatedTranscript = '';

  constructor(callbacks: VoiceRecorderCallbacks = {}) {
    this.callbacks = callbacks;
    if (!SpeechRecognitionCtor) {
      this.setState('unsupported');
      return;
    }
    this.recognition = new SpeechRecognitionCtor!();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }
      if (finalText) {
        this.accumulatedTranscript += (this.accumulatedTranscript ? ' ' : '') + finalText;
        this.callbacks.onTranscript?.(this.accumulatedTranscript, true);
        this.callbacks.onResult?.(this.accumulatedTranscript);
      }
      if (interim) {
        const display = this.accumulatedTranscript + (this.accumulatedTranscript && interim ? ' ' : '') + interim;
        this.callbacks.onTranscript?.(display, false);
      }
    };

    this.recognition.onend = () => {
      if (this._state === 'listening') {
        this.setState('processing');
        this.callbacks.onResult?.(this.accumulatedTranscript);
        // Keep "processing" visible briefly so UI can show spinner
        setTimeout(() => this.setState('idle'), 500);
      } else {
        this.setState('idle');
      }
    };

    this.recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'aborted' || e.error === 'no-speech') return;
      let message: string;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        message = 'Microphone access denied';
      } else if (e.error === 'network') {
        message = isElectron()
          ? 'Voice input is not available in the desktop app. Use the app in Chrome (e.g. http://localhost:5173) to use voice.'
          : 'Speech service unavailable. Check your network connection.';
      } else {
        message = e.message || String(e.error) || 'Recognition error';
      }
      this.callbacks.onError?.(message);
      this.setState('error');
      this.setState('idle');
    };
  }

  private setState(state: VoiceRecorderState) {
    this._state = state;
    this.callbacks.onStateChange?.(state);
  }

  get state(): VoiceRecorderState {
    return this._state;
  }

  /**
   * Start listening. Requests microphone permission if needed.
   * Real-time transcript is delivered via onTranscript; final text via onResult.
   */
  async start(): Promise<void> {
    if (!this.recognition) return;
    if (this._state === 'listening') return;
    const allowed = await requestMicrophonePermission();
    if (!allowed) {
      this.callbacks.onError?.('Microphone access denied');
      this.setState('error');
      return;
    }
    this.accumulatedTranscript = '';
    this.setState('listening');
    this.recognition.start();
  }

  /**
   * Stop listening. Final transcript is still delivered via onResult/onTranscript.
   */
  stop(): void {
    if (!this.recognition || this._state !== 'listening') return;
    this.recognition.stop();
    this.setState('processing');
  }

  /**
   * Get the full transcribed text so far (e.g. after stop).
   */
  getTranscript(): string {
    return this.accumulatedTranscript;
  }

  /**
   * Reset accumulated transcript.
   */
  reset(): void {
    this.accumulatedTranscript = '';
  }
}
