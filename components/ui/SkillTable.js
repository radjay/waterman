import { Badge } from "./Badge.js";

/**
 * Numeric comparison table for forecast skill. Numbers are font-data.
 * Horizontal scroll on narrow screens.
 */
export function SkillTable({
  caption,
  rows = [],
  winnerModel,
  columns = [
    { key: "hours", label: "Hours" },
    { key: "speedMae", label: "Steady wind, kt off", digits: 1, suffix: "" },
    { key: "gustMae", label: "Gusts, kt off", digits: 1, suffix: "" },
    { key: "mae", label: "Overall, kt off", digits: 1, suffix: "" },
    { key: "bias", label: "Too high / too low", digits: 1, suffix: "" },
  ],
}) {
  if (!rows.length) return null;

  return (
    <div>
      {caption ? <p className="text-[13px] text-faded-ink mb-3 max-w-[70ch]">{caption}</p> : null}
      <div className="overflow-x-auto border border-card rounded-card bg-surface">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-card">
              <th className="px-3 py-2 font-data text-[10px] tracking-label-wide uppercase text-dim">
                Model
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 font-data text-[10px] tracking-label-wide uppercase text-dim"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isWinner = winnerModel && row.model === winnerModel && !row.contextOnly;
              return (
                <tr key={row.model} className="border-t border-card">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-data text-[12px] ${isWinner ? "text-accent" : "text-ink"}`}>
                        {row.label ?? row.model}
                      </span>
                      {isWinner ? <Badge variant="accent">Winner</Badge> : null}
                      {row.contextOnly ? <Badge variant="marginal">Context</Badge> : null}
                      {row.synthetic ? <Badge variant="marginal">Rule</Badge> : null}
                    </div>
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2 font-data text-[12px] tabular-nums text-ink">
                      {formatCell(row[col.key], col)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCell(value, col) {
  if (!Number.isFinite(value)) return "—";
  const digits = col.digits ?? 0;
  return `${value.toFixed(digits)}${col.suffix ?? ""}`;
}
