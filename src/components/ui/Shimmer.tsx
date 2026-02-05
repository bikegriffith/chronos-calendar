/** Shimmer effect for skeleton placeholders. Use with chronos-shimmer in CSS. */
export function Shimmer({ className = '' }: { className?: string }) {
  return <span className={`chronos-shimmer inline-block ${className}`} aria-hidden />;
}
