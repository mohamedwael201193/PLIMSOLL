export function DiamondMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 4 L20 12 L12 20 L4 12 Z" fill="currentColor" />
      <circle cx="12" cy="12" r="2" fill="#FCD535" />
    </svg>
  );
}
