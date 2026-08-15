/**
 * The day chip on a window card — TODAY, SATURDAY, SUNDAY.
 *
 * Spelled out, never abbreviated: these sit alone on a card rather than in a
 * column of seven, so there is room, and "SAT" beside a spot name reads like a
 * code where "SATURDAY" reads like an answer.
 *
 * Three variants because the chip has to work on three grounds:
 *   today   — filled accent, page-coloured text. The soonest window leads.
 *   muted   — on a card, `bg-track` with ink text.
 *   overlay — on a cam still, dark scrim + hairline so it survives any frame.
 */
export function DayTag({ children, variant = "muted", size = "sm", className = "" }) {
  const px = size === "md" ? 10 : 9.5;
  const base =
    "inline-flex items-center font-data font-bold tracking-label leading-none uppercase";
  const skin = {
    today: "bg-accent text-page",
    muted: "bg-track text-ink",
    overlay: "text-[#EAF4F6] border",
  }[variant];

  return (
    <span
      className={`${base} ${skin} ${className}`}
      style={{
        fontSize: px,
        borderRadius: size === "md" ? 6 : 5,
        padding: size === "md" ? "4px 9px" : "3px 7px",
        ...(variant === "overlay"
          ? {
              background: "rgba(4,8,13,.72)",
              borderColor: "rgba(234,244,246,.24)",
            }
          : null),
      }}
    >
      {children}
    </span>
  );
}
