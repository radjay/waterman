/**
 * Forecast vs station scatter. Diagonal is a perfect match.
 */
export function ForecastObsScatter({ points = [], title, caption }) {
  const usable = points.filter(
    (point) => Number.isFinite(point.observed) && Number.isFinite(point.forecast)
  );
  if (usable.length === 0) return null;

  const max = Math.max(
    5,
    ...usable.flatMap((point) => [point.observed, point.forecast])
  );
  const topKt = Math.ceil(max / 5) * 5 || 5;
  const width = 320;
  const height = 320;
  const margin = { top: 12, right: 12, bottom: 40, left: 40 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const x = (value) => margin.left + (value / topKt) * innerW;
  const y = (value) => margin.top + innerH - (value / topKt) * innerH;
  const ticks = [];
  for (let kt = 0; kt <= topKt; kt += 5) ticks.push(kt);

  return (
    <div>
      {title ? (
        <p className="font-data text-[10px] tracking-label-wide uppercase text-dim mb-2">{title}</p>
      ) : null}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[360px] text-ink" role="img">
        <title>Forecast versus Cabo Raso station</title>
        {ticks.map((kt) => (
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
              fontSize="9"
            >
              {kt}
            </text>
          </g>
        ))}
        <line
          x1={x(0)}
          y1={y(0)}
          x2={x(topKt)}
          y2={y(topKt)}
          className="stroke-accent/50"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        {usable.map((point, index) => (
          <circle
            key={index}
            cx={x(point.forecast)}
            cy={y(point.observed)}
            r="2.2"
            className={point.falseGo ? "fill-accent" : "fill-ink/45"}
          />
        ))}
        <text x={width / 2} y={height - 8} textAnchor="middle" className="fill-dim font-data" fontSize="10">
          Model mix (kt)
        </text>
        <text
          x="12"
          y={height / 2}
          textAnchor="middle"
          className="fill-dim font-data"
          fontSize="10"
          transform={`rotate(-90 12 ${height / 2})`}
        >
          Station mix (kt)
        </text>
      </svg>
      {caption ? <p className="mt-2 text-[13px] text-faded-ink max-w-[46ch]">{caption}</p> : null}
    </div>
  );
}
