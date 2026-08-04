import { ThemeProvider } from 'waterman';

// Resolves Nightglass or Dayglass from the local sunrise/sunset, with an
// Auto/Night/Day preference persisted in Settings. The resolution runs in a
// pre-paint bootstrap script as well as here — the NOAA sunrise maths is
// stringified from this module so the two cannot drift apart and flash the
// wrong theme on load.
export const ResolvesTheTheme = () => (
  <ThemeProvider>
    <div className="rounded-card-lg border border-card bg-surface p-4 max-w-md">
      <div className="font-data text-[10px] tracking-label text-dim mb-2">THEME TOKENS</div>
      <div className="flex gap-2">
        <span className="w-10 h-10 rounded-card bg-page border border-card" />
        <span className="w-10 h-10 rounded-card bg-surface border border-card" />
        <span className="w-10 h-10 rounded-card bg-accent" />
        <span className="w-10 h-10 rounded-card bg-ink" />
      </div>
      <p className="text-[13px] text-faded-ink mt-3">
        Every colour resolves through a CSS custom property, so a subtree repaints
        entirely when the theme flips.
      </p>
    </div>
  </ThemeProvider>
);
