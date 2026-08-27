/**
 * Horizontal MAE ranking bars. Winner uses accent; others use ink on track.
 * Values must also appear as text — colour is not the only signal.
 */
export function RankingBars({
  title,
  rows = [],
  valueKey = "mae",
  winnerKey,
  formatLabel = (row) => row.label ?? row.key,
  unit = "kt",
  digits = 2,
  lowerIsBetter = true,
}) {
  const values = rows.map((row) => row[valueKey]).filter(Number.isFinite);
  if (values.length === 0) return null;
  const max = Math.max(...values) * 1.15 || 1;

  return (
    <div>
      {title ? (
        <p className="font-data text-[10px] tracking-label-wide uppercase text-dim mb-3">{title}</p>
      ) : null}
      <ul className="space-y-2.5">
        {rows.map((row) => {
          const value = row[valueKey];
          if (!Number.isFinite(value)) return null;
          const key = row.key ?? row.model;
          const isWinner = winnerKey && key === winnerKey;
          const widthPct = Math.max(4, (value / max) * 100);
          return (
            <li key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <div
                  className={`truncate font-data text-[12px] ${
                    isWinner ? "text-accent font-semibold" : "text-ink"
                  }`}
                >
                  {formatLabel(row)}
                  {isWinner ? (lowerIsBetter ? " · best" : " · top") : ""}
                </div>
                <div className="mt-1 h-2 rounded-full bg-track">
                  <div
                    className={`h-2 rounded-full ${isWinner ? "bg-accent" : "bg-ink/40"}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
              <span
                className={`font-data text-[12px] tabular-nums ${
                  isWinner ? "text-accent font-semibold" : "text-ink"
                }`}
              >
                {unit === "%" ? `${value.toFixed(digits)}%` : `${value.toFixed(digits)} ${unit}`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
