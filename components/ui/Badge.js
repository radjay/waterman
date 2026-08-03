/**
 * Badge — small mono label.
 *
 * Mono labels are the treatment most at risk on contrast, which is why Dayglass
 * drops the accent from #6EE7F0 to #0E7A85. Keep them at 9-11px and rely on the
 * accent tokens rather than raw colours.
 *
 * @param {"default"|"epic"|"accent"|"marginal"|"live"} variant
 */
const BASE =
  "px-2 py-0.5 font-data text-[0.625rem] uppercase tracking-label inline-flex items-center gap-1 leading-[1.4] rounded-pill";

export function Badge({ children, variant = "default", className = "" }) {
  const variants = {
    default: `${BASE} text-faded-ink border border-card bg-surface`,
    // "epic" used to be green; the palette has no green, so a top score now
    // reads in the accent like everything else worth acting on.
    epic: `${BASE} text-accent border border-accent-border bg-accent-tint-card`,
    accent: `${BASE} text-accent border border-accent-border bg-accent-tint-card`,
    marginal: `${BASE} text-marginal border border-marginal/30 bg-marginal/10`,
    // Solid accent, page-colour text — for LIVE and rider-count badges sitting
    // on top of video.
    live: `${BASE} bg-accent text-page font-bold border border-transparent`,
  };

  return <div className={`${variants[variant] || variants.default} ${className}`}>{children}</div>;
}
