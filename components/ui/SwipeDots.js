"use client";

/**
 * The swipe affordance under the Now cam.
 *
 * The active spot is a 22px bar, the rest are 8px dots — a row of identical
 * dots says "there are more" but not "you are here", and Now is a screen about
 * one spot at a time. Tapping a dot is the keyboard/pointer equivalent of the
 * swipe, so the gesture is never the only way through.
 */
export function SwipeDots({ count, index, onSelect, labels = [], className = "" }) {
  if (!count || count < 2) return null;

  return (
    <div className={`flex gap-[5px] ${className}`} role="tablist" aria-label="Spot">
      {Array.from({ length: count }, (_, i) => {
        const active = i === index;
        return (
          <button
            key={i}
            role="tab"
            aria-selected={active}
            aria-label={labels[i] ?? `Spot ${i + 1}`}
            onClick={() => onSelect?.(i)}
            className="py-2 -my-2 focus-ring rounded-[2px]"
          >
            <span
              className={`block h-[3px] rounded-[2px] transition-all duration-base ease-smooth ${
                active ? "w-[22px] bg-accent" : "w-2 bg-track-strong"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
