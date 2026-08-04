/**
 * Badge — small mono label.
 *
 * Mono labels are the treatment most at risk on contrast, which is why Dayglass
 * drops the accent from #6EE7F0 to #0E7A85. Keep them at 9-11px and rely on the
 * accent tokens rather than raw colours.
 *
 * @param {"default"|"epic"|"accent"|"marginal"|"live"|"overlay"|"accent-solid"} variant
 */
const BASE =
  "px-2 py-0.5 font-data text-[0.625rem] uppercase tracking-label inline-flex items-center gap-1 leading-[1.4] rounded-pill";

export function Badge({ children, variant = "default", className = "", ...props }) {
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
    // Over video. White on a dark scrim, because the backdrop is footage
    // rather than the page — theme text tokens are wrong here by definition.
    overlay: `${BASE} bg-black/70 text-white backdrop-blur-sm border border-transparent`,
    // Also over video, but opaque page fill so it stays legible against any
    // frame. The tinted `accent` variant is translucent and disappears over a
    // bright sky.
    "accent-solid": `${BASE} bg-page text-accent border border-accent-border`,
  };

  return (
    <div className={`${variants[variant] || variants.default} ${className}`} {...props}>
      {children}
    </div>
  );
}
