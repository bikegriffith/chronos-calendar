import { useRef, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2 } from 'lucide-react';
import {
  VoiceRecorder,
  isVoiceInputAvailable,
  type VoiceRecorderState,
} from '../services/voiceRecorder';

type ButtonState = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported';
export interface VoiceButtonProps {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onResult?: (text: string) => void;
  /** BCP 47 language for speech recognition (e.g. from settings). */
  language?: string;
  className?: string;
}

const RIPPLE_COUNT = 3;
const RIPPLE_DURATION = 2;

export default function VoiceButton({
  onTranscript,
  onResult,
  language,
  className = '',
}: VoiceButtonProps) {
  const [state, setState] = useState<ButtonState>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const recorderRef = useRef<VoiceRecorder | null>(null);

  const handleStateChange = useCallback((s: VoiceRecorderState) => {
    setState(s);
    if (s === 'idle' || s === 'error') {
      setLiveTranscript('');
      if (s === 'idle') setErrorMessage('');
    }
  }, []);

  const handleTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      setLiveTranscript(text);
      onTranscript?.(text, isFinal);
    },
    [onTranscript]
  );

  const handleResult = useCallback(
    (text: string) => {
      onResult?.(text);
    },
    [onResult]
  );

  const handleError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  useEffect(() => {
    if (!isVoiceInputAvailable()) {
      setState('unsupported');
      setErrorMessage(
        typeof window !== 'undefined' && (window as Window & { electronAPI?: unknown }).electronAPI
          ? 'Voice input is not available in the desktop app. Use the app in Chrome (e.g. http://localhost:5173) to use voice.'
          : 'Voice input is not supported in this browser.'
      );
      return;
    }
    const recorder = new VoiceRecorder(
      {
        onStateChange: handleStateChange,
        onTranscript: handleTranscript,
        onResult: handleResult,
        onError: handleError,
      },
      { lang: language }
    );
    recorderRef.current = recorder;
    return () => {
      recorder.stop();
      recorderRef.current = null;
    };
  }, [handleStateChange, handleTranscript, handleResult, handleError, language]);

  const toggle = useCallback(() => {
    const r = recorderRef.current;
    if (!r || state === 'unsupported') return;
    if (state === 'listening') {
      r.stop();
    } else {
      r.reset();
      r.start();
    }
  }, [state]);

  const isActive = state === 'listening' || state === 'processing';
  const showTranscript = liveTranscript.length > 0;

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      {/* Live transcription above button */}
      <AnimatePresence mode="wait">
        {showTranscript && (
          <motion.div
            key="transcript"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="max-w-[240px] min-h-[2.5rem] px-4 py-2 rounded-2xl bg-white/90 dark:bg-neutral-dark-800/95 backdrop-blur-md border border-neutral-200/80 dark:border-neutral-dark-600/80 shadow-lg flex items-center justify-center"
          >
            <p className="text-body-sm text-neutral-800 dark:text-neutral-dark-100 text-center line-clamp-2">
              {liveTranscript || '…'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button container with ripples when listening */}
      <motion.div
        className="relative flex items-center justify-center"
        initial={false}
        animate={{ scale: 1 }}
      >
        {/* Expanding ripples — only when listening */}
        {state === 'listening' &&
          Array.from({ length: RIPPLE_COUNT }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full bg-gradient-to-br from-accent-primary/40 to-accent-info/30 pointer-events-none"
              initial={{ scale: 0.6, opacity: 0.6 }}
              animate={{
                scale: 2.2 + i * 0.3,
                opacity: 0,
              }}
              transition={{
                duration: RIPPLE_DURATION,
                repeat: Infinity,
                delay: (i * RIPPLE_DURATION) / RIPPLE_COUNT,
                ease: 'easeOut',
              }}
              style={{ width: 72, height: 72, margin: -36 }}
            />
          ))}

        {/* Main button */}
        <motion.button
          type="button"
          aria-label={state === 'listening' ? 'Stop listening' : 'Start voice input'}
          disabled={state === 'unsupported'}
          onClick={toggle}
          className="relative flex items-center justify-center w-[72px] h-[72px] rounded-full min-w-[72px] min-h-[72px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-dark-900 overflow-hidden"
          initial={false}
          animate={{
            scale: state === 'idle' ? [1, 1.03, 1] : 1,
            background: isActive
              ? 'linear-gradient(135deg, #5B9BD5 0%, #42A5F5 50%, #64B5F6 100%)'
              : 'linear-gradient(145deg, #5B9BD5 0%, #4A8BC2 100%)',
            boxShadow: isActive
              ? '0 0 32px rgba(91, 155, 213, 0.5), 0 8px 24px rgba(0,0,0,0.15)'
              : '0 8px 24px rgba(91, 155, 213, 0.35), 0 4px 12px rgba(0,0,0,0.1)',
          }}
          transition={{
            scale: { duration: 2.5, repeat: state === 'idle' ? Infinity : 0, ease: 'easeInOut' },
            background: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
            boxShadow: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
          }}
          whileTap={{ scale: 0.94 }}
          whileHover={state === 'idle' ? { scale: 1.05 } : undefined}
        >
          {/* Idle: subtle pulse (handled by repeating scale animation when idle) */}
          {state === 'idle' && (
            <motion.span
              className="absolute inset-0 rounded-full bg-white/20"
              animate={{ opacity: [0.15, 0.35, 0.15] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {/* Icon or spinner */}
          <span className="relative flex items-center justify-center text-white">
            <AnimatePresence mode="wait">
              {state === 'processing' ? (
                <motion.span
                  key="spinner"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center"
                >
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="w-8 h-8" strokeWidth={2.5} />
                  </motion.span>
                </motion.span>
              ) : (
                <motion.span
                  key="mic"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center"
                >
                  <Mic className="w-8 h-8" strokeWidth={2} />
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </motion.button>
      </motion.div>

      {/* Unavailable / error message */}
      <AnimatePresence>
        {(state === 'unsupported' || (state === 'error' && errorMessage)) && (
          <motion.p
            key={errorMessage || 'unsupported'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-caption text-neutral-600 dark:text-neutral-dark-400 text-center max-w-[260px] px-2"
          >
            {state === 'unsupported' ? errorMessage : errorMessage}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
