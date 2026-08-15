/**
 * The all-caps mono micro label — WIND, WAVES & TIDE, SCORE, THE WEEK, MY SPOTS.
 *
 * One component because the treatment is exact and repeated on every screen:
 * JetBrains Mono, uppercase, .22em tracking, `text-dim`. Written by hand it
 * drifted between 8.5 and 11px with three different tracking values.
 *
 * @param {"sm"|"md"} size  8.5px on a phone card, 9.5px on desktop
 */
export function MicroLabel({ children, size = "sm", as: Tag = "div", className = "" }) {
  const px = size === "md" ? 9.5 : size === "lg" ? 11 : 9;
  return (
    <Tag
      className={`font-data uppercase tracking-label-wide text-dim leading-none ${className}`}
      style={{ fontSize: px }}
    >
      {children}
    </Tag>
  );
}
