import { MicroLabel } from "../ui/MicroLabel";

/**
 * The row above a chart band: what it is on the left, how to read it on the
 * right.
 *
 * The legend lives here rather than under the panel because the three bands
 * are read one at a time — a rider looking at WAVES & TIDE should not have to
 * scroll past SCORE to find out which line is the tide.
 *
 * `aside` is for a short note next to the label when needed. Live station knots
 * on NOW use LiveStationBadge in the screen header instead — burying them here
 * made the reading too quiet.
 */
export function BandHeader({ label, legend, aside = null, size = "sm", className = "" }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${className}`}>
      <div className="flex items-baseline gap-2.5 min-w-0">
        <MicroLabel size={size}>{label}</MicroLabel>
        {aside}
      </div>
      {legend ? (
        <div
          className="flex gap-2.5 font-data whitespace-nowrap"
          style={{ fontSize: size === "md" ? 9.5 : 8.5 }}
        >
          {legend}
        </div>
      ) : (
        <div />
      )}
    </div>
  );
}

/** One legend entry. `mark` is the glyph the band actually draws. */
export function LegendKey({ mark, children, tone = "ink", dim = false }) {
  const color = {
    ink: "text-ink",
    accent: "text-accent",
    muted: "text-faded-ink",
    now: "text-now",
  }[tone];
  return (
    <span className={color} style={dim ? { opacity: 0.6 } : undefined}>
      {mark} {children}
    </span>
  );
}

/** Legends, defined once so Now, Live and Spot forecast cannot disagree. */
export const WIND_LIVE_LEGEND = (
  <>
    <LegendKey mark="—">station</LegendKey>
    <LegendKey mark="--" dim>
      gusts
    </LegendKey>
    <LegendKey mark="▮" tone="accent">
      forecast
    </LegendKey>
  </>
);

export const WIND_FORECAST_LEGEND = (
  <>
    <LegendKey mark="▮" tone="accent">
      base
    </LegendKey>
    <span className="text-accent" style={{ opacity: 0.55 }}>
      ▮ gusts
    </span>
  </>
);

/** Only names lines that are actually on the plot — see waveTidePresence. */
export const waveTideLegend = ({ wave, tide }) => (
  <>
    {wave && (
      <LegendKey mark="—" tone="muted">
        wave
      </LegendKey>
    )}
    {tide && (
      <LegendKey mark="--" tone="accent">
        tide
      </LegendKey>
    )}
  </>
);

/** The label follows the same rule: a band with no tide is not "& tide". */
export const waveTideLabel = ({ wave, tide }) =>
  wave && tide ? "Waves & tide" : tide ? "Tide" : "Waves";
