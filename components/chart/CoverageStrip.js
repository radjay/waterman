/**
 * Month strip: filled cells have station hours we could score.
 */
export function CoverageStrip({ months = [] }) {
  if (!months.length) return null;

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-min">
        {months.map((row) => {
          const filled = row.scoredHours > 0;
          const empty = row.stationHours === 0;
          return (
            <div
              key={row.month}
              className={`w-10 shrink-0 rounded-sm border px-1 py-2 text-center ${
                empty
                  ? "border-card bg-track"
                  : filled
                    ? "border-accent-border bg-accent-tint-card"
                    : "border-card bg-surface"
              }`}
              title={`${row.month}: ${row.stationHours} station hours, ${row.scoredHours} scored`}
            >
              <p className="font-data text-[9px] tracking-label uppercase text-dim">
                {row.month.slice(2)}
              </p>
              <p className="font-data text-[10px] tabular-nums text-ink mt-1">{row.stationHours}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
