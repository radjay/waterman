export function EmptyState({ className = "" }) {
  return (
    <div
      className={`text-center p-16 font-headline italic text-2xl text-faded-ink border border-dashed border-ink ${className}`}
    >
      NO FORECASTS TO DISPLAY AT THIS TIME.
    </div>
  );
}

