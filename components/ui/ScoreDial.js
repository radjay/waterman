import { scoreBand, scoreColor, scoreTextClass } from "../../lib/dayChart";

export { scoreBand };

/**
 * ScoreDial — a ring, not a bare number.
 *
 * Drawn as an SVG arc rather than a conic-gradient: the design's ring has a
 * rounded cap on the value end, which reads as a gauge that has been filled
 * to a point. A conic gradient can only ever produce a hard radial edge, and
 * it also needs an opaque disc punched into the middle to hide the wedge —
 * which then has to know what colour the card behind it is. A stroked arc
 * needs neither, so the dial works on the page, on a tinted card, and over a
 * cam still without being told.
 *
 * Geometry is fixed by the handoff: viewBox 0 0 100 100, r=44, rotated -90 so
 * zero is at twelve o'clock. Circumference = 2πr = 276.46, and the value arc is
 * `276.46 × score/100` with 276.46 as the gap.
 *
 * @param {number|null} score      0-100. null renders the placeholder ring.
 * @param {number|string} size     outer diameter in px (40-84 in the designs),
 *                                 or one of the legacy names xs/sm/md/lg/xl
 * @param {number} [ring]          stroke width; derived from size when omitted
 * @param {boolean} [showAll]      render scores under 60. Off by default, which
 *                                 is the legacy list behaviour; every screen in
 *                                 the redesign passes it, because a marginal
 *                                 score is the answer on a flat day.
 * @param {number} [value]         font size for the number; derived when omitted
 * @param {Function} [onClick]
 */
const CIRCUMFERENCE = 276.46;

/** Legacy t-shirt sizes, kept so the older screens keep rendering. */
const NAMED_SIZES = { xs: 36, sm: 44, md: 52, lg: 74, xl: 104 };

const resolveSize = (size) =>
  typeof size === "number" ? size : (NAMED_SIZES[size] ?? NAMED_SIZES.md);

/** Ring gets proportionally heavier as the dial gets smaller, per the handoff. */
function defaultRing(size) {
  if (size <= 40) return 11;
  if (size <= 48) return 11;
  if (size <= 56) return 10;
  return 9;
}

/** The number inside is ~35% of the diameter, rounded to the design's steps. */
const defaultValueSize = (size) => Math.round(size * 0.35);

export function ScoreDial({
  score,
  size = 46,
  ring,
  value,
  showAll = false,
  onClick,
  className = "",
  title,
}) {
  const px = resolveSize(size);
  if (score === null || score === undefined) {
    // Callers that never opted into low scores never asked for a placeholder
    // either — keep the old "render nothing" contract for them.
    if (!showAll) return null;
    return <ScoreDialEmpty size={px} className={className} />;
  }
  if (!showAll && score < 60) return null;

  const stroke = ring ?? defaultRing(px);
  const fontSize = value ?? defaultValueSize(px);
  const clamped = Math.max(0, Math.min(100, score));
  const color = scoreColor(score);

  const interactive = Boolean(onClick);

  return (
    // Not a <button>: dials sit inside rows that are themselves buttons, and a
    // nested button is invalid HTML that React fails hydration on.
    <span
      onClick={onClick}
      role={interactive ? "button" : "img"}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      aria-label={title ?? `Score ${Math.round(score)}`}
      className={`relative flex-none ${
        interactive
          ? "cursor-pointer focus-ring rounded-full active:scale-[0.97] transition-transform duration-fast ease-smooth"
          : ""
      } ${className}`}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--wm-track)" strokeWidth={stroke} />
        {/* Omitted entirely at zero. A round cap on a zero-length dash still
            paints a dot at twelve o'clock, which reads as a tiny score rather
            than as none. */}
        {clamped > 0 && (
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${((CIRCUMFERENCE * clamped) / 100).toFixed(1)} ${CIRCUMFERENCE}`}
          />
        )}
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-data font-bold tabular-nums leading-none tracking-[-0.02em] ${scoreTextClass(
          score
        )}`}
        style={{ fontSize }}
      >
        {Math.round(score)}
      </span>
    </span>
  );
}

/**
 * The dial's absence, drawn.
 *
 * A spot with no score for the selected sport gets a dashed ring with an em
 * dash rather than a zero or a gap: "we have nothing for you here" is an
 * answer, and a 0 would read as "conditions are terrible" instead.
 */
export function ScoreDialEmpty({ size = 46, className = "" }) {
  const px = resolveSize(size);
  return (
    <span
      role="img"
      aria-label="No score"
      className={`flex-none rounded-full border border-dashed border-card flex items-center justify-center font-data text-dim leading-none ${className}`}
      style={{ width: px, height: px, fontSize: Math.round(px * 0.33) }}
    >
      —
    </span>
  );
}
