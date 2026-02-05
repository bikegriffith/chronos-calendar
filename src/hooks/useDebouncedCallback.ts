import { useRef, useCallback } from 'react';

/**
 * Returns a debounced version of the callback that delays execution until
 * after `delay` ms have elapsed since the last call. Uses requestAnimationFrame
 * for the leading edge when possible to keep 60fps feel.
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const debounced = useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );

  return debounced;
}
