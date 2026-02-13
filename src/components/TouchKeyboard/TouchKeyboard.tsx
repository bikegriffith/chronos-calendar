import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Hash, Smile } from 'lucide-react';
import { useTouchKeyboardContext } from '@/contexts/TouchKeyboardContext';
import { TOUCH_KEYBOARD_HEIGHT_PX } from '@/contexts/TouchKeyboardContext';
import {
  VoiceRecorder,
  isSpeechRecognitionSupported,
} from '@/services/voiceRecorder';

type AlphaMode = 'alpha' | 'special' | 'emoji';

const ROW1 = 'qwertyuiop';
const ROW2 = 'asdfghjkl';
const ROW3 = 'zxcvbnm';

const SPECIAL_ROW1 = '@#$%^&*()';
const SPECIAL_ROW2 = '!"\'+,-./:;';
const SPECIAL_ROW3 = '?<=>[]\\{}|';

const EMOJI_ROW1 = ['😀', '😊', '😃', '😁', '😄', '😅', '😂', '🤣', '😭', '😢'];
const EMOJI_ROW2 = ['✅', '❌', '📅', '📆', '📌', '📍', '🏠', '🏢', '🏫', '🏥'];
const EMOJI_ROW3 = ['⏰', '🎉', '🎂', '🎄', '🎃', '💡', '💰', '🚗', '✈️', '🏈'];

const NUMPAD: { char: string; action?: 'backspace' }[][] = [
  [{ char: '7' }, { char: '8' }, { char: '9' }],
  [{ char: '4' }, { char: '5' }, { char: '6' }],
  [{ char: '1' }, { char: '2' }, { char: '3' }],
  [{ char: '.' }, { char: '0' }, { char: '', action: 'backspace' }],
];

const KEYBOARD_HEIGHT_PX = TOUCH_KEYBOARD_HEIGHT_PX;

/** Explicit width/height for alpha/special/emoji keys - matches numeric key size (h-14 = 56px) */
const ALPHA_KEY_W = 48;
const ALPHA_KEY_H = 56;

function Key({
  label,
  onPress,
  className = '',
  wide,
}: {
  label: string;
  onPress: () => void;
  className?: string;
  wide?: boolean;
}) {
  return (
    <motion.button
      type="button"
      tabIndex={-1}
      onClick={onPress}
      className={`touch-key select-none rounded-xl font-medium text-neutral-800 dark:text-neutral-dark-100 bg-white dark:bg-neutral-dark-700 border border-neutral-300 dark:border-neutral-dark-600 shadow-sm active:shadow-inner flex items-center justify-center shrink-0 ${
        wide ? 'flex-[2] max-w-[140px]' : ''
      } ${className}`}
      style={wide ? undefined : { width: ALPHA_KEY_W, minHeight: ALPHA_KEY_H }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {label}
    </motion.button>
  );
}

function BackspaceIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12H6M6 12L10 8M6 12L10 16" />
    </svg>
  );
}

export default function TouchKeyboard() {
  const ctx = useTouchKeyboardContext();
  const [shift, setShift] = useState(false);
  const [alphaMode, setAlphaMode] = useState<AlphaMode>('alpha');
  const voiceRecorderRef = useRef<VoiceRecorder | null>(null);

  const insert = useCallback(
    (char: string) => {
      ctx?.sendKey(shift ? char.toUpperCase() : char);
      setShift(false);
    },
    [ctx, shift]
  );

  const backspace = useCallback(() => {
    ctx?.sendKey('backspace');
  }, [ctx]);

  const done = useCallback(() => {
    ctx?.sendKey('done');
  }, [ctx]);

  const handleVoicePress = useCallback(() => {
    if (!ctx?.insertText || !isSpeechRecognitionSupported()) return;
    if (!voiceRecorderRef.current) {
      voiceRecorderRef.current = new VoiceRecorder(
        {
          onResult: (text) => {
            if (text?.trim()) ctx.insertText(text.trim() + ' ');
          },
          onError: () => {},
          onStateChange: (state) => setVoiceListening(state === 'listening'),
        },
        { lang: ctx.voiceLanguage ?? navigator.language ?? 'en-US' }
      );
    }
    const recorder = voiceRecorderRef.current;
    if (recorder.state === 'listening') {
      recorder.stop();
    } else {
      recorder.start();
    }
  }, [ctx]);

  useEffect(() => {
    return () => {
      voiceRecorderRef.current?.stop();
    };
  }, []);

  const voiceSupported = isSpeechRecognitionSupported();
  const [voiceListening, setVoiceListening] = useState(false);

  return (
    <AnimatePresence>
      {ctx?.keyboardVisible && (
        <motion.div
          key="touch-keyboard"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: KEYBOARD_HEIGHT_PX, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed left-0 right-0 bottom-0 z-[60] overflow-hidden bg-[#d1d5db] dark:bg-neutral-dark-800 border-t border-neutral-300 dark:border-neutral-dark-600 safe-area-pb"
          aria-label="Touch keyboard"
          data-touch-keyboard
          onPointerDownCapture={(e) => {
            e.preventDefault();
          }}
        >
          <div className="h-full flex justify-center items-end px-4 pb-3 pt-1">
            {/* Centered keyboard content */}
            <div className="flex gap-4 items-end max-w-2xl">
              {/* Alpha section */}
              <div className="flex flex-col justify-end gap-2 shrink-0">
                {/* Row 1: letters/special/emoji + delete */}
                <div className="flex gap-1.5 items-stretch">
                  {alphaMode === 'alpha' &&
                    (shift ? ROW1.toUpperCase() : ROW1)
                      .split('')
                      .map((char) => (
                        <Key
                          key={char}
                          label={char}
                          onPress={() => insert(char)}
                        />
                      ))}
                  {alphaMode === 'special' &&
                    SPECIAL_ROW1.split('').map((char) => (
                      <Key
                        key={char}
                        label={char}
                        onPress={() => insert(char)}
                      />
                    ))}
                  {alphaMode === 'emoji' &&
                    EMOJI_ROW1.map((emoji, i) => (
                      <Key
                        key={`e1-${i}`}
                        label={emoji}
                        onPress={() => insert(emoji)}
                      />
                    ))}
                  <motion.button
                    type="button"
                    tabIndex={-1}
                    onClick={backspace}
                    className="touch-key select-none rounded-xl flex items-center justify-center bg-white dark:bg-neutral-dark-700 border border-neutral-300 dark:border-neutral-dark-600 shadow-sm active:shadow-inner text-neutral-600 dark:text-neutral-dark-300 shrink-0"
                    style={{ width: ALPHA_KEY_W, minHeight: ALPHA_KEY_H }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    aria-label="Backspace"
                  >
                    <BackspaceIcon className="w-5 h-5" />
                  </motion.button>
                </div>
                {/* Row 2 — offset for QWERTY stagger in alpha mode */}
                <div
                  className={`flex gap-1.5 items-stretch ${alphaMode === 'alpha' ? 'pl-2' : ''}`}
                >
                  {alphaMode === 'alpha' &&
                    (shift ? ROW2.toUpperCase() : ROW2)
                      .split('')
                      .map((char) => (
                        <Key
                          key={char}
                          label={char}
                          onPress={() => insert(char)}
                        />
                      ))}
                  {alphaMode === 'special' &&
                    SPECIAL_ROW2.split('').map((char) => (
                      <Key
                        key={char}
                        label={char}
                        onPress={() => insert(char)}
                      />
                    ))}
                  {alphaMode === 'emoji' &&
                    EMOJI_ROW2.map((emoji, i) => (
                      <Key
                        key={`e2-${i}`}
                        label={emoji}
                        onPress={() => insert(emoji)}
                      />
                    ))}
                </div>
                {/* Row 3: shift (alpha only) + letters/special/emoji */}
                <div className="flex gap-1.5 items-stretch">
                  {alphaMode === 'alpha' ? (
                    <Key
                      label="⇧"
                      onPress={() => setShift((s) => !s)}
                      className={`text-lg transition-colors ${
                        shift
                          ? 'bg-sky-200 dark:bg-sky-800/80 border-sky-400 dark:border-sky-600 text-sky-800 dark:text-sky-200'
                          : ''
                      }`}
                    />
                  ) : (
                    <div
                      style={{ width: ALPHA_KEY_W }}
                      className="shrink-0"
                      aria-hidden
                    />
                  )}
                  {alphaMode === 'alpha' &&
                    (shift ? ROW3.toUpperCase() : ROW3)
                      .split('')
                      .map((char) => (
                        <Key
                          key={char}
                          label={char}
                          onPress={() => insert(char)}
                        />
                      ))}
                  {alphaMode === 'special' &&
                    SPECIAL_ROW3.split('').map((char) => (
                      <Key
                        key={char}
                        label={char}
                        onPress={() => insert(char)}
                      />
                    ))}
                  {alphaMode === 'emoji' &&
                    EMOJI_ROW3.map((emoji, i) => (
                      <Key
                        key={`e3-${i}`}
                        label={emoji}
                        onPress={() => insert(emoji)}
                      />
                    ))}
                </div>
                {/* Row 4: Special | Emoji | Voice | Space | Done */}
                <div className="flex gap-2 items-stretch">
                  <motion.button
                    type="button"
                    tabIndex={-1}
                    onClick={() =>
                      setAlphaMode((m) =>
                        m === 'special' ? 'alpha' : 'special'
                      )
                    }
                    className={`touch-key select-none rounded-xl min-h-14 flex items-center justify-center shrink-0 transition-colors ${
                      alphaMode === 'special'
                        ? 'bg-sky-200 dark:bg-sky-800/80 border-sky-400 dark:border-sky-600 text-sky-800 dark:text-sky-200'
                        : 'bg-white dark:bg-neutral-dark-700 border border-neutral-300 dark:border-neutral-dark-600 text-neutral-600 dark:text-neutral-dark-300'
                    }`}
                    style={{ width: 44 }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    aria-label="Special characters"
                  >
                    <Hash className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    type="button"
                    tabIndex={-1}
                    onClick={() =>
                      setAlphaMode((m) => (m === 'emoji' ? 'alpha' : 'emoji'))
                    }
                    className={`touch-key select-none rounded-xl min-h-14 flex items-center justify-center shrink-0 transition-colors ${
                      alphaMode === 'emoji'
                        ? 'bg-sky-200 dark:bg-sky-800/80 border-sky-400 dark:border-sky-600 text-sky-800 dark:text-sky-200'
                        : 'bg-white dark:bg-neutral-dark-700 border border-neutral-300 dark:border-neutral-dark-600 text-neutral-600 dark:text-neutral-dark-300'
                    }`}
                    style={{ width: 44 }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    aria-label="Emoji"
                  >
                    <Smile className="w-5 h-5" />
                  </motion.button>
                  {voiceSupported && (
                    <motion.button
                      type="button"
                      tabIndex={-1}
                      onClick={handleVoicePress}
                      className={`touch-key select-none rounded-xl min-h-14 flex items-center justify-center shrink-0 transition-colors ${
                        voiceListening
                          ? 'bg-red-200 dark:bg-red-900/60 border-red-400 dark:border-red-600 text-red-700 dark:text-red-300'
                          : 'bg-white dark:bg-neutral-dark-700 border border-neutral-300 dark:border-neutral-dark-600 text-neutral-600 dark:text-neutral-dark-300'
                      }`}
                      style={{ width: 44 }}
                      whileTap={{ scale: 0.92 }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 25,
                      }}
                      aria-label={
                        voiceListening ? 'Stop listening' : 'Voice input'
                      }
                    >
                      <Mic className="w-5 h-5" />
                    </motion.button>
                  )}
                  <motion.button
                    type="button"
                    tabIndex={-1}
                    onClick={() => insert(' ')}
                    className="touch-key select-none flex-1 max-w-[240px] min-h-14 rounded-xl font-medium text-neutral-800 dark:text-neutral-dark-100 bg-white dark:bg-neutral-dark-700 border border-neutral-300 dark:border-neutral-dark-600 shadow-sm active:shadow-inner"
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    aria-label="Space"
                  >
                    space
                  </motion.button>
                  <motion.button
                    type="button"
                    tabIndex={-1}
                    onClick={done}
                    className="touch-key select-none min-w-[80px] min-h-14 rounded-xl font-semibold text-white bg-[#5B9BD5] dark:bg-accent-primary border border-[#4A8BC2] dark:border-accent-primary-dark shadow-sm active:shadow-inner shrink-0"
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    Done
                  </motion.button>
                </div>
              </div>

              {/* Numeric keypad */}
              <div className="flex flex-col gap-2 shrink-0">
                {NUMPAD.map((row, ri) => (
                  <div key={ri} className="flex gap-2 h-14">
                    {row.map((cell, ci) =>
                      cell.action === 'backspace' ? (
                        <motion.button
                          key={`${ri}-${ci}`}
                          type="button"
                          tabIndex={-1}
                          onClick={backspace}
                          className="touch-key select-none rounded-xl w-14 h-14 flex items-center justify-center bg-white dark:bg-neutral-dark-700 border border-neutral-300 dark:border-neutral-dark-600 shadow-sm active:shadow-inner text-neutral-600 dark:text-neutral-dark-300 shrink-0"
                          whileTap={{ scale: 0.92 }}
                          transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 25,
                          }}
                          aria-label="Backspace"
                        >
                          <BackspaceIcon className="w-4 h-4" />
                        </motion.button>
                      ) : (
                        <motion.button
                          key={`${ri}-${ci}`}
                          type="button"
                          tabIndex={-1}
                          onClick={() => insert(cell.char)}
                          className="touch-key select-none rounded-xl w-14 h-14 flex items-center justify-center font-medium text-neutral-800 dark:text-neutral-dark-100 bg-white dark:bg-neutral-dark-700 border border-neutral-300 dark:border-neutral-dark-600 shadow-sm active:shadow-inner shrink-0"
                          whileTap={{ scale: 0.94 }}
                          transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 25,
                          }}
                        >
                          {cell.char}
                        </motion.button>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
