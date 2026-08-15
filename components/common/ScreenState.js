"use client";

/**
 * Loading, broken, and empty — the three states every screen has and none of
 * them wants to invent.
 *
 * The distinction that matters is between "we cannot reach the forecast" and
 * "there is nothing on". They looked identical before, which is the worst
 * possible failure for this app: a rider who is told the coast is flat when it
 * is actually blowing 25 stops trusting the screen.
 */
export function ScreenError({
  title = "Cannot reach the forecast",
  body = "This is a connection problem, not a flat day. Try again in a moment.",
  onRetry,
}) {
  return (
    <div className="rounded-card-lg border border-marginal/30 bg-marginal-low p-4 mt-4">
      <div className="font-data text-[10px] tracking-label text-marginal mb-1.5 uppercase">
        {title}
      </div>
      <p className="text-[13px] text-faded-ink leading-[1.45]">{body}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 font-data text-[11px] tracking-label text-accent focus-ring"
        >
          RETRY
        </button>
      )}
    </div>
  );
}

export function ScreenEmpty({ title, body, actionLabel, onAction }) {
  return (
    <div className="pt-10 text-center">
      <p className="font-headline font-extrabold text-[27px] tracking-display-tight text-ink leading-[1.1]">
        {title}
      </p>
      {body && <p className="text-[14px] text-faded-ink mt-3 max-w-[46ch] mx-auto">{body}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 font-data text-[11px] tracking-label text-accent focus-ring"
        >
          {actionLabel} →
        </button>
      )}
    </div>
  );
}

/**
 * Skeletons in the shape of the screen they precede, so the layout does not
 * jump when the data lands.
 */
export function ScreenSkeleton({ variant = "now" }) {
  if (variant === "now") {
    return (
      <div className="animate-pulse" aria-hidden="true">
        <div className="h-7 w-56 bg-surface rounded" />
        <div className="-mx-5 mt-3 aspect-video bg-surface md:mx-0 md:rounded-card-lg" />
        <div className="h-11 w-full bg-surface rounded mt-5" />
        <div className="h-[260px] w-full bg-surface rounded mt-5" />
      </div>
    );
  }
  if (variant === "cards") {
    return (
      <div className="animate-pulse mt-4 flex flex-col gap-2.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-card-lg bg-surface border border-card h-[92px]" />
        ))}
        <div className="rounded-card-lg bg-surface border border-card h-[220px] mt-4" />
      </div>
    );
  }
  return (
    <div className="animate-pulse mt-4 flex flex-col gap-2" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-card-lg bg-surface border border-card h-[210px]" />
      ))}
    </div>
  );
}
