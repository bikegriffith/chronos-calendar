import { useId, useCallback } from 'react';
import { useTouchKeyboardContext } from '@/contexts/TouchKeyboardContext';

export interface TouchFriendlyTextareaProps
  extends Omit<
    React.ComponentPropsWithoutRef<'textarea'>,
    'value' | 'onChange' | 'readOnly'
  > {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Textarea that, when touch keyboard mode is on, uses the app’s touch-friendly
 * keyboard instead of the system keyboard.
 */
export function TouchFriendlyTextarea({
  value,
  onChange,
  onFocus,
  onBlur,
  className,
  ...rest
}: TouchFriendlyTextareaProps) {
  const id = useId();
  const ctx = useTouchKeyboardContext();
  const useTouch = Boolean(ctx?.useTouchKeyboard);

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (useTouch && ctx) {
        ctx.openKeyboard(id, value, onChange);
      }
      onFocus?.(e);
    },
    [useTouch, ctx, id, value, onChange, onFocus]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (useTouch && ctx) {
        const target = e.relatedTarget as Node | null;
        if (target && document.querySelector('[data-touch-keyboard]')?.contains(target)) {
          return;
        }
        ctx.closeKeyboard();
      }
      onBlur?.(e);
    },
    [useTouch, ctx, onBlur]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      if (useTouch && ctx) {
        ctx.openKeyboard(id, value, onChange);
      }
      rest.onClick?.(e);
    },
    [useTouch, ctx, id, value, onChange, rest]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value;
      if (useTouch && ctx) ctx.syncValue(id, v);
      onChange(v);
    },
    [useTouch, ctx, id, onChange]
  );

  return (
    <textarea
      {...rest}
      value={value}
      onChange={handleChange}
      readOnly={false}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleClick}
      inputMode={useTouch ? 'none' : rest.inputMode}
      autoComplete={useTouch ? 'off' : rest.autoComplete}
      className={[className, useTouch && 'caret-sky-600 dark:caret-sky-400'].filter(Boolean).join(' ')}
    />
  );
}
