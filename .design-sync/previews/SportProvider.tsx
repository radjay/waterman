import { SportProvider, SportFilterChip } from 'waterman';

// Context, not chrome. One source of truth for the selected sport, persisted,
// so Now, Next and Cams cannot disagree about what the rider is here for.
// Every surface with a sport control has to sit inside it.
export const WrapsTheSportControl = () => (
  <SportProvider>
    <div className="flex items-center gap-4">
      <SportFilterChip />
      <span className="font-body text-[12px] text-faded-ink">
        SportFilterChip reads and writes this provider — it takes no props at all
      </span>
    </div>
  </SportProvider>
);
