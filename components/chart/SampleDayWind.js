/**
 * One Lisbon day: forecast as columns (base + gust cap), live station as lines.
 */
export function SampleDayWind({ hours = [], modelKey, modelLabel, compact = false }) {
  if (!hours.length) return null;
  const width = 560;
  const height = compact ? 156 : 220;
  const margin = { top: 12, right: 16, bottom: 32, left: 44 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const minHour = 7;
  const maxHour = 22;
  const span = maxHour - minHour;
  const maxKt = Math.max(
    10,
    ...hours.flatMap((hour) =>
      [
        hour.observedSpeed,
        hour.observedGust,
        hour.models?.[modelKey]?.speed,
        hour.models?.[modelKey]?.gust,
      ].filter(Number.isFinite)
    )
  );
  const topKt = Math.ceil(maxKt / 5) * 5;
  const x = (hourLocal) => margin.left + ((hourLocal - minHour) / span) * innerW;
  const y = (kt) => margin.top + innerH - (kt / topKt) * innerH;
  const slotW = innerW / span;
  const barW = Math.max(6, slotW * 0.45);
  const yTicks = [];
  for (let kt = 0; kt <= topKt; kt += 5) yTicks.push(kt);

  const baseLine = linePath(hours, (hour) => hour.observedSpeed, x, y);
  const gustLine = linePath(hours, (hour) => hour.observedGust, x, y);

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full text-ink" role="img">
        <title>{`${modelLabel} forecast columns and live station lines`}</title>
        {yTicks.map((kt) => (
          <g key={kt}>
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={y(kt)}
              y2={y(kt)}
              className="stroke-ink/10"
              strokeWidth="1"
            />
            <text
              x={margin.left - 6}
              y={y(kt) + 3}
              textAnchor="end"
              className="fill-dim font-data"
              fontSize="10"
            >
              {kt}
            </text>
          </g>
        ))}
        <text
          x="14"
          y={margin.top + innerH / 2}
          textAnchor="middle"
          className="fill-dim font-data"
          fontSize="10"
          transform={`rotate(-90 14 ${margin.top + innerH / 2})`}
        >
          knots
        </text>
        {hours.map((hour) => {
          const forecast = hour.models?.[modelKey];
          const speed = forecast?.speed;
          if (!Number.isFinite(speed) || !Number.isFinite(hour.hourLocal)) return null;
          const gust = Number.isFinite(forecast?.gust) ? Math.max(forecast.gust, speed) : speed;
          const cx = x(hour.hourLocal);
          const baseTop = y(speed);
          const gustTop = y(gust);
          const baseHeight = y(0) - baseTop;
          const gustHeight = baseTop - gustTop;
          return (
            <g key={hour.hourLocal}>
              <rect
                x={cx - barW / 2}
                y={baseTop}
                width={barW}
                height={Math.max(0, baseHeight)}
                rx="2"
                className="fill-ink/30"
              />
              {gustHeight > 0.5 ? (
                <rect
                  x={cx - barW / 2}
                  y={gustTop}
                  width={barW}
                  height={gustHeight}
                  rx="2"
                  className="fill-ink/15"
                />
              ) : null}
            </g>
          );
        })}
        {baseLine ? (
          <path d={baseLine} fill="none" className="stroke-accent" strokeWidth="2" />
        ) : null}
        {gustLine ? (
          <path
            d={gustLine}
            fill="none"
            className="stroke-accent"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
        ) : null}
        {[7, 10, 13, 16, 19, 22].map((hour) => (
          <text
            key={hour}
            x={x(hour)}
            y={height - 8}
            textAnchor="middle"
            className="fill-dim font-data"
            fontSize="10"
          >
            {String(hour).padStart(2, "0")}
          </text>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-data text-[10px] tracking-label-wide uppercase text-dim">
        {compact ? (
          <>
            <span className="text-ink">Forecast</span>
            <span className="text-accent">Live base</span>
            <span className="text-accent">Live gust</span>
          </>
        ) : (
          <>
            <span className="text-ink">Forecast column · solid is base, pale is gust</span>
            <span className="text-accent">Live base</span>
            <span className="text-accent">Live gust · dashed</span>
          </>
        )}
      </div>
    </div>
  );
}

function linePath(hours, read, x, y) {
  const pts = hours
    .map((hour) => {
      const value = read(hour);
      if (!Number.isFinite(value) || !Number.isFinite(hour.hourLocal)) return null;
      return `${x(hour.hourLocal)},${y(value)}`;
    })
    .filter(Boolean);
  if (pts.length < 2) return "";
  return `M ${pts.join(" L ")}`;
}
