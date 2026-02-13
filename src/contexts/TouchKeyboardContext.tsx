import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export const TOUCH_KEYBOARD_HEIGHT_PX = 320;

export interface TouchKeyboardContextValue {
  useTouchKeyboard: boolean;
  keyboardVisible: boolean;
  /** Height in px when keyboard is visible; 0 when hidden. */
  keyboardHeight: number;
  openKeyboard: (
    id: string,
    value: string,
    onChange: (value: string) => void
  ) => void;
  closeKeyboard: () => void;
  /** Insert a character or 'backspace' or 'done' */
  sendKey: (key: string) => void;
  /** Current value of the focused field (for backspace) */
  activeValue: string;
}

const TouchKeyboardContext = createContext<TouchKeyboardContextValue | null>(
  null
);

export function useTouchKeyboardContext(): TouchKeyboardContextValue | null {
  return useContext(TouchKeyboardContext);
}

interface TouchKeyboardProviderProps {
  useTouchKeyboard: boolean;
  children: ReactNode;
}

export function TouchKeyboardProvider({
  useTouchKeyboard,
  children,
}: TouchKeyboardProviderProps) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [activeValue, setActiveValue] = useState('');
  const activeIdRef = useRef<string | null>(null);
  const onChangeRef = useRef<((value: string) => void) | null>(null);

  const openKeyboard = useCallback(
    (id: string, value: string, onChange: (value: string) => void) => {
      if (!useTouchKeyboard) return;
      activeIdRef.current = id;
      onChangeRef.current = onChange;
      setActiveValue(value);
      setKeyboardVisible(true);
    },
    [useTouchKeyboard]
  );

  const closeKeyboard = useCallback(() => {
    activeIdRef.current = null;
    onChangeRef.current = null;
    setKeyboardVisible(false);
  }, []);

  const sendKey = useCallback((key: string) => {
    const onChange = onChangeRef.current;
    if (!onChange) return;
    if (key === 'backspace') {
      setActiveValue((prev) => {
        const next = prev.slice(0, -1);
        onChange(next);
        return next;
      });
      return;
    }
    if (key === 'done') {
      closeKeyboard();
      return;
    }
    setActiveValue((prev) => {
      const next = prev + key;
      onChange(next);
      return next;
    });
  }, [closeKeyboard]);

  const value: TouchKeyboardContextValue = {
    useTouchKeyboard,
    keyboardVisible,
    keyboardHeight: keyboardVisible ? TOUCH_KEYBOARD_HEIGHT_PX : 0,
    openKeyboard,
    closeKeyboard,
    sendKey,
    activeValue,
  };

  return (
    <TouchKeyboardContext.Provider value={value}>
      {children}
    </TouchKeyboardContext.Provider>
  );
}
