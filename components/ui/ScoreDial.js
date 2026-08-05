import { SportBadge } from "./SportBadge";

/**
 * Score bands. The mid-tier colour changed meaning in the new themes: what was
 * a yellow "warning" tint is now the accent-2 hue, reading as "marginal, look
 * closer". Below ~45 the dial drops to the dim text colour so a flat day reads
 * as near-empty rather than alarming — on a summer lull nothing clears 60 and
 * the empty state IS the screen, so accent is withheld for the one thing worth
 * acting on.
 */
export function scoreBand(score) {
  if (score >= 60) return "good";
  if (score >= 45) return "marginal";
  return "low";
}

const RING_COLOR = {
  good: "rgb(var(--wm-accent))",
  marginal: "rgb(var(--wm-marginal))",
  low: "var(--wm-dim)",
};

const TEXT_CLASS = {
  good: "text-accent",
  marginal: "text-marginal",
  low: "text-dim",
};

const SIZES = {
  // xs is not in the handoff's list; it exists for the calendar grid, where a
  // 44px dial does not fit a day cell.
  xs: { outer: 36, value: 12, label: 5.5 },
  sm: { outer: 44, value: 13, label: 6 },
  md: { outer: 52, value: 15, label: 6.5 },
  lg: { outer: 74, value: 22, label: 6.5 },
  xl: { outer: 104, value: 30, label: 8 },
};

/**
 * ScoreDial — conic-gradient ring with the number inside. Replaces ScorePill.
 *
 * @param {number} score - Condition score (0-100)
 * @param {"sm"|"md"|"lg"|"xl"} size - 44px lists, 52px rows, 74/104px hero
 * @param {boolean} showAll - If false (default) scores under 60 are hidden
 * @param {"page"|"card"} on - What the dial sits on. A tinted card needs the
 *   inner disc to match the card, not the page, or it punches a hole.
 * @param {string} label - Optional caption inside the dial (SCORE / BEST / PEAK)
 * @param {"wingfoil"|"kitesurfing"|"surfing"} sport - Optional sport glyph
 * @param {Function} onClick - Optional click handler (renders as button)
 */
export function ScoreDial({
  score,
  size = "md",
  showAll = false,
  on = "page",
  label,
  sport,
  onClick,
  className = "",
}) {
  if (score === null || score === undefined) return null;
  // The showAll rule is unchanged from ScorePill: scores under 60 stay hidden
  // unless the user explicitly asks for them.
  if (!showAll && score < 60) return null;

  const band = scoreBand(score);
  const s = SIZES[size] || SIZES.md;
  // Inner disc is ~78% of the outer diameter.
  const inner = Math.round(s.outer * 0.78);
  const clamped = Math.max(0, Math.min(100, score));

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      aria-label={onClick ? `Score ${score}` : undefined}
      className={`flex-none rounded-full flex items-center justify-center ${
        onClick ? "focus-ring active:scale-[0.97] transition-transform duration-fast ease-smooth" : ""
      } ${className}`}
      style={{
        width: s.outer,
        height: s.outer,
        background: `conic-gradient(${RING_COLOR[band]} 0 ${clamped}%, var(--wm-track) ${clamped}% 100%)`,
      }}
    >
      <span
        data-dial-disc=""
        className="rounded-full flex flex-col items-center justify-center"
        style={{
          width: inner,
          height: inner,
          // Must be opaque. A translucent surface token lets the conic-gradient
          // ring show through and the dial reads as a pie chart.
          background:
            on === "card" ? "var(--wm-dial-inner-card)" : "rgb(var(--wm-page))",
        }}
      >
        {sport && <SportBadge sport={sport} size={Math.round(s.value * 0.7)} className="text-ink" />}
        <span
          className={`font-data font-bold tabular-nums leading-none ${TEXT_CLASS[band]}`}
          style={{ fontSize: s.value }}
        >
          {Math.round(score)}
        </span>
        {label && (
          <span
            className="font-data uppercase text-dim leading-none mt-[2px]"
            style={{ fontSize: s.label, letterSpacing: "0.18em" }}
          >
            {label}
          </span>
        )}
      </span>
    </Tag>
  );
}
