import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTouchKeyboardContext } from '@/contexts/TouchKeyboardContext';

import { TOUCH_KEYBOARD_HEIGHT_PX } from '@/contexts/TouchKeyboardContext';

const ROW1 = 'qwertyuiop';
const ROW2 = 'asdfghjkl';
const ROW3 = 'zxcvbnm';

const KEYBOARD_HEIGHT_PX = TOUCH_KEYBOARD_HEIGHT_PX;

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
      className={`touch-key select-none rounded-xl font-medium text-neutral-800 dark:text-neutral-dark-100 bg-white dark:bg-neutral-dark-700 border border-neutral-300 dark:border-neutral-dark-600 shadow-sm active:shadow-inner min-h-[52px] flex items-center justify-center ${
        wide ? 'flex-[2] max-w-[160px]' : 'flex-1 min-w-[32px] max-w-[40px]'
      } ${className}`}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {label}
    </motion.button>
  );
}

export default function TouchKeyboard() {
  const ctx = useTouchKeyboardContext();
  const [shift, setShift] = useState(false);

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
        <div className="h-full flex flex-col justify-end px-2 pb-3 pt-3 gap-2">
          {/* Row 1 */}
          <div className="flex justify-center gap-1.5">
            {(shift ? ROW1.toUpperCase() : ROW1).split('').map((char) => (
              <Key key={char} label={char} onPress={() => insert(char)} />
            ))}
          </div>
          {/* Row 2 */}
          <div className="flex justify-center gap-1.5">
            {(shift ? ROW2.toUpperCase() : ROW2).split('').map((char) => (
              <Key key={char} label={char} onPress={() => insert(char)} />
            ))}
          </div>
          {/* Row 3: shift + letters + backspace */}
          <div className="flex justify-center gap-1.5 items-stretch">
            <Key
              label={shift ? '⇧' : '⇧'}
              onPress={() => setShift((s) => !s)}
              className="min-w-[44px] max-w-[52px] text-lg"
            />
            {(shift ? ROW3.toUpperCase() : ROW3).split('').map((char) => (
              <Key key={char} label={char} onPress={() => insert(char)} />
            ))}
            <motion.button
              type="button"
              tabIndex={-1}
              onClick={backspace}
              className="touch-key select-none rounded-xl min-w-[44px] max-w-[52px] min-h-[52px] flex items-center justify-center bg-white dark:bg-neutral-dark-700 border border-neutral-300 dark:border-neutral-dark-600 shadow-sm active:shadow-inner text-neutral-600 dark:text-neutral-dark-300"
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              aria-label="Backspace"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <path d="M10 11l4 4m0-4l-4 4" />
              </svg>
            </motion.button>
          </div>
          {/* Row 4: space + Done */}
          <div className="flex justify-center gap-1.5 items-stretch">
            <motion.button
              type="button"
              tabIndex={-1}
              onClick={() => insert(' ')}
              className="touch-key select-none flex-1 max-w-[240px] min-h-[52px] rounded-xl font-medium text-neutral-800 dark:text-neutral-dark-100 bg-white dark:bg-neutral-dark-700 border border-neutral-300 dark:border-neutral-dark-600 shadow-sm active:shadow-inner"
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
              className="touch-key select-none min-w-[88px] min-h-[52px] rounded-xl font-semibold text-white bg-[#5B9BD5] dark:bg-accent-primary border border-[#4A8BC2] dark:border-accent-primary-dark shadow-sm active:shadow-inner"
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              Done
            </motion.button>
          </div>
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
