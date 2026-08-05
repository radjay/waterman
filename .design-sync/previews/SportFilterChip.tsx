import { SportFilterChip, SportProvider } from 'waterman';

// The one sport control. It takes no props — it reads and writes SportProvider,
// so every surface showing it agrees about the current sport by construction.
// Anything that looks like a sport filter and is not this is a bug.
export const Chip = () => (
  <SportProvider>
    <div className="flex items-center gap-4">
      <SportFilterChip />
      <span className="font-body text-[12px] text-faded-ink">
        Click to open — wing, kite and surf, each with its own mark
      </span>
    </div>
  </SportProvider>
);

export const InAHeader = () => (
  <SportProvider>
    <header className="flex items-start justify-between gap-3 max-w-[520px]">
      <h2 className="font-headline font-extrabold text-[25px] tracking-display-tight text-ink leading-tight">
        Next windows
      </h2>
      <SportFilterChip className="flex-none mt-1" />
    </header>
  </SportProvider>
);
