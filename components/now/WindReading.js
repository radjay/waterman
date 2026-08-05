/**
 * Preferred wind/wave reading: big number, gust above unit+compass.
 * No direction arrow — the label is enough.
 *
 * `items-baseline` locks "kn NNW" to the same baseline as the big number so
 * they share a line at the bottom of the digits. Gust sits just above that
 * unit row (out of flow) so it cannot steal the flex baseline.
 *
 * `md` is responsive: slightly smaller on phones so a timeslot can host wind +
 * dial without them colliding; full size from the md breakpoint up.
 * `lg` is the station-card / hero scale.
 */
export function WindReading({ metric, size = "md" }) {
  if (!metric || metric.value === null || metric.value === undefined) return null;

  if (size === "lg") {
    return (
      <div className="flex items-baseline gap-1 min-w-0">
        <span className="font-data font-bold text-[38px] sm:text-[44px] leading-none text-ink tabular-nums">
          {metric.value}
        </span>
        <span className="relative">
          {metric.secondary && (
            <span className="absolute left-0 bottom-full mb-0.5 font-data font-normal text-[11px] text-faded-ink tabular-nums leading-none whitespace-nowrap">
              {metric.secondary}
            </span>
          )}
          <span className="flex items-baseline gap-1 leading-none">
            <span className="font-data font-bold text-[16px] sm:text-[18px] leading-none text-ink">
              {metric.unit}
            </span>
            {metric.directionLabel && (
              <span className="font-data font-normal text-[13px] sm:text-[14px] leading-none text-ink">
                {metric.directionLabel}
              </span>
            )}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-0.5 min-w-0 md:gap-1">
      <span className="font-data font-bold text-[26px] md:text-[36px] leading-none text-ink tabular-nums">
        {metric.value}
      </span>
      <span className="relative">
        {metric.secondary && (
          <span className="absolute left-0 bottom-full mb-0.5 font-data font-normal text-[9px] md:text-[11px] text-faded-ink tabular-nums leading-none whitespace-nowrap">
            {metric.secondary}
          </span>
        )}
        <span className="flex items-baseline gap-0.5 md:gap-1 leading-none">
          <span className="font-data font-bold text-[12px] md:text-[15px] leading-none text-ink">
            {metric.unit}
          </span>
          {metric.directionLabel && (
            <span className="font-data font-normal text-[11px] md:text-[13px] leading-none text-ink">
              {metric.directionLabel}
            </span>
          )}
        </span>
      </span>
    </div>
  );
}
