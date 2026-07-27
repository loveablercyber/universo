export function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <span className="h-px w-10 bg-copper/50" />
      <svg width="10" height="10" viewBox="0 0 10 10" className="text-copper">
        <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="currentColor" />
      </svg>
      <span className="h-px w-10 bg-copper/50" />
    </div>
  );
}
