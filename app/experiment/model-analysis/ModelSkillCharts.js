"use client";

const CHART_COLORS = ["#059669", "#0284c7", "#d97706", "#7c3aed", "#db2777", "#0891b2"];

function fmt(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "—";
}

function modelColor(index) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/** Plain-language explainer — shown before results load so MAE is never a mystery. */
export function MetricsExplainer({ bestTypicalMissKt }) {
  return (
    <section className="rounded-lg border border-sky-200 bg-sky-50/80 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-sky-950">How we score models (in plain English)</h3>
      <p className="mt-2 text-sm leading-relaxed text-sky-950/90">
        Each hour, we compare what the model <em>predicted</em> at CNC Foil with what the station{" "}
        <em>actually recorded</em>. We care about <strong className="font-medium">effective wind</strong> —{" "}
        (speed + gust) / 2 — because that is what kick-in logic uses, not gust alone or base speed alone.
      </p>

      <div className="mt-4 grid gap-3 rounded-md border border-sky-200/80 bg-white p-4 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center sm:gap-4">
        <div className="text-center sm:text-left">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink/45">Model said</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-ink">14 kt</p>
          <p className="text-xs text-ink/55">effective wind</p>
        </div>
        <p className="hidden text-ink/30 sm:block">→</p>
        <div className="text-center sm:text-left">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink/45">Station saw</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-ink">17 kt</p>
          <p className="text-xs text-ink/55">effective wind</p>
        </div>
        <p className="hidden text-ink/30 sm:block">=</p>
        <div className="rounded-md bg-sky-100 px-3 py-2 text-center sm:text-left">
          <p className="text-[11px] font-medium uppercase tracking-wide text-sky-900/70">Miss this hour</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-sky-950">3 kt</p>
          <p className="text-xs text-sky-900/70">forecast was 3 kt low</p>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm leading-relaxed text-sky-950/90">
        <p>
          <strong className="font-medium text-sky-950">Typical miss (MAE)</strong> — “MAE” is stats jargon. Read
          it as: <em>on average, how many knots wrong was the forecast?</em> We take the miss each hour (always
          positive — 3 kt too high and 3 kt too low both count as 3), average them, and get one number in knots.
          <strong className="font-medium text-sky-950"> Lower is better.</strong>
        </p>
        {Number.isFinite(bestTypicalMissKt) ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-950">
            In this date range, the best model is typically about{" "}
            <span className="font-semibold tabular-nums">{fmt(bestTypicalMissKt)} kt</span> off each hour — e.g. if
            the station is reading ~15 kt effective, the forecast might land near{" "}
            {fmt(Math.max(0, 15 - bestTypicalMissKt))}–{fmt(15 + bestTypicalMissKt)} kt.
          </p>
        ) : null}
        <p>
          <strong className="font-medium text-sky-950">Bias</strong> — does the model systematically forecast too
          high (+) or too low (−)? A model can have a low typical miss but still always overshoot; bias catches
          that pattern.
        </p>
        <p>
          <strong className="font-medium text-sky-950">Daily curve (correlation)</strong> — separate from typical
          miss: does the forecast follow the <em>shape</em> of the day — building mid-morning, peaking, fading —
          even when it is consistently a few knots off? Scored 0–1; <strong className="font-medium text-sky-950">1
          = perfect shape match</strong>, 0 = no relationship, negative = opposite pattern.
        </p>
      </div>
    </section>
  );
}

export function RegimeSplitBar({ nortada, nonNortada }) {
  const total = nortada + nonNortada;
  if (total === 0) return null;
  const nortadaPct = Math.round((nortada / total) * 100);
  return (
    <div>
      <p className="text-xs font-medium text-ink/60">Observed hours by wind regime</p>
      <div className="mt-2 flex h-8 overflow-hidden rounded-md border border-ink/10">
        <div
          className="flex items-center justify-center bg-sky-100 text-[11px] font-medium text-sky-900"
          style={{ width: `${nortadaPct}%` }}
          title={`Nortada: ${nortada} hours`}
        >
          {nortadaPct >= 12 ? `Nortada ${nortadaPct}%` : ""}
        </div>
        <div
          className="flex items-center justify-center bg-amber-100 text-[11px] font-medium text-amber-900"
          style={{ width: `${100 - nortadaPct}%` }}
          title={`Non-Nortada: ${nonNortada} hours`}
        >
          {100 - nortadaPct >= 12 ? `Other ${100 - nortadaPct}%` : ""}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-ink/50">
        Nortada {nortada.toLocaleString()} h · Non-Nortada {nonNortada.toLocaleString()} h
      </p>
    </div>
  );
}

export function HorizontalMaeChart({
  title,
  rows,
  valueKey = "value",
  formatLabel,
  highlightKey,
}) {
  const values = rows.map((row) => row[valueKey]).filter(Number.isFinite);
  if (values.length === 0) return null;
  const max = Math.max(...values) * 1.15;

  return (
    <div>
      {title ? <p className="text-xs font-medium text-ink/60">{title}</p> : null}
      <ul className={`space-y-2 ${title ? "mt-3" : ""}`}>
        {rows.map((row, index) => {
          const value = row[valueKey];
          if (!Number.isFinite(value)) return null;
          const widthPct = Math.max(4, (value / max) * 100);
          const isWinner = highlightKey && row.key === highlightKey;
          return (
            <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm">
              <div className="min-w-0">
                <div
                  className={`truncate ${isWinner ? "font-semibold text-emerald-800" : "text-ink/80"}`}
                  title={formatLabel(row.key)}
                >
                  {formatLabel(row.key)}
                  {isWinner ? " · best" : ""}
                </div>
                <div className="mt-1 h-2 rounded-full bg-ink/5">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: isWinner ? "#059669" : modelColor(index),
                    }}
                  />
                </div>
              </div>
              <span className={`tabular-nums ${isWinner ? "font-semibold text-emerald-800" : "text-ink/70"}`}>
                {fmt(value)} kt
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function WinnerSpotlight({ spotlight, formatLabel }) {
  if (!spotlight) return null;

  const { winner, runnerUp, stats, tradeoffs, nortadaPct } = spotlight;

  return (
    <section className="overflow-hidden rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
      <div className="border-b border-emerald-100 px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-800/70">Top model</p>
        <h3 className="mt-1 text-lg font-semibold text-emerald-950">{formatLabel(winner.model)}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-900/90">{spotlight.lead}</p>
      </div>

      <div className="grid gap-px bg-emerald-100 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white/90 px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink/45">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{fmt(stat.value)} kt</p>
            <p className="mt-1 text-xs text-ink/60">{stat.detail}</p>
          </div>
        ))}
      </div>

      {runnerUp && Number.isFinite(spotlight.effectiveGap) && (
        <div className="border-t border-emerald-100 px-5 py-4">
          <p className="text-xs font-medium text-ink/60">Head-to-head vs runner-up</p>
          <HeadToHeadChart
            rows={spotlight.headToHead}
            formatLabel={formatLabel}
            className="mt-3"
          />
          <p className="mt-3 text-sm text-ink/70">
            {formatLabel(winner.model)} is typically{" "}
            <span className="font-semibold tabular-nums text-emerald-800">{fmt(spotlight.effectiveGap)} kt</span>{" "}
            closer to the station each hour than {formatLabel(runnerUp.model)} — that is the gap in average miss
            on effective wind.
          </p>
        </div>
      )}

      <div className="border-t border-emerald-100 px-5 py-4">
        <p className="text-xs font-medium text-ink/60">Why effective wind?</p>
        <p className="mt-2 text-sm leading-relaxed text-ink/75">
          Kick-in uses sustained effective wind {(spotlight.kickInThreshold ?? 12).toFixed(0)} kt — average of
          base speed and gusts. A model can get base speed right but gusts wrong (or vice versa); we rank on
          effective wind so both count. {nortadaPct}% of comparable hours here are Nortada, so a model that
          tracks north wind well matters most for summer bay sessions.
        </p>
        {tradeoffs.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm text-ink/70">
            {tradeoffs.map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function HeadToHeadChart({ rows, formatLabel, className = "" }) {
  if (!rows?.length) return null;

  const metrics = [
    { key: "effectiveMae", label: "Typical miss (effective)", lowerIsBetter: true },
    { key: "nortadaMae", label: "Typical miss (Nortada)", lowerIsBetter: true },
    { key: "gustMae", label: "Typical miss (gusts)", lowerIsBetter: true },
  ];

  const chartWidth = 360;
  const rowHeight = 52;
  const labelWidth = 108;
  const plotWidth = chartWidth - labelWidth - 8;
  const chartHeight = metrics.length * rowHeight + 16;

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className={`w-full max-w-md ${className}`}>
      {metrics.map((metric, metricIndex) => {
        const values = rows.map((row) => row[metric.key]).filter(Number.isFinite);
        if (values.length === 0) return null;
        const best = metric.lowerIsBetter ? Math.min(...values) : Math.max(...values);
        const max = Math.max(...values) * 1.12;
        const y = metricIndex * rowHeight + 8;

        return (
          <g key={metric.key}>
            <text x={0} y={y + 14} className="fill-ink/60 text-[10px]">
              {metric.label}
            </text>
            {rows.map((row, index) => {
              const value = row[metric.key];
              if (!Number.isFinite(value)) return null;
              const barW = Math.max(6, (value / max) * plotWidth);
              const barY = y + index * 14;
              const isBest = value === best;
              return (
                <g key={`${metric.key}-${row.model}`}>
                  <rect
                    x={labelWidth}
                    y={barY}
                    width={barW}
                    height={10}
                    rx={2}
                    fill={isBest ? "#059669" : index === 0 ? "#0284c7" : "#94a3b8"}
                    opacity={isBest ? 1 : 0.75}
                  />
                  <text
                    x={labelWidth + barW + 4}
                    y={barY + 9}
                    className={`text-[9px] ${isBest ? "fill-emerald-800 font-semibold" : "fill-ink/55"}`}
                  >
                    {truncate(formatLabel(row.model), 14)} {fmt(value)}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function RegimeCompareChart({ models, byModel, formatLabel }) {
  const rows = models
    .map((row) => ({
      key: row.model,
      nortada: byModel[row.model]?.nortada?.effective?.mae,
      nonNortada: byModel[row.model]?.nonNortada?.effective?.mae,
    }))
    .filter((row) => Number.isFinite(row.nortada) || Number.isFinite(row.nonNortada));

  if (rows.length === 0) return null;

  const max = Math.max(
    ...rows.flatMap((row) => [row.nortada, row.nonNortada]).filter(Number.isFinite)
  ) * 1.15;

  const barHeight = 14;
  const groupHeight = 36;
  const chartHeight = rows.length * groupHeight + 24;
  const chartWidth = 320;
  const labelWidth = 140;
  const plotWidth = chartWidth - labelWidth;

  return (
    <div>
      <p className="text-xs font-medium text-ink/60">Typical miss by wind direction (effective wind, kt)</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink/60">
        <span>
          <span className="inline-block h-2 w-3 rounded-sm bg-sky-500 align-middle" /> Nortada
        </span>
        <span>
          <span className="inline-block h-2 w-3 rounded-sm bg-amber-500 align-middle" /> Non-Nortada
        </span>
      </div>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="mt-3 w-full max-w-lg text-ink/40">
        {rows.map((row, index) => {
          const y = index * groupHeight + 8;
          const nortadaW = Number.isFinite(row.nortada) ? (row.nortada / max) * plotWidth : 0;
          const otherW = Number.isFinite(row.nonNortada) ? (row.nonNortada / max) * plotWidth : 0;
          return (
            <g key={row.key}>
              <text x={0} y={y + barHeight + 2} className="fill-ink/70 text-[9px]">
                {truncate(formatLabel(row.key), 18)}
              </text>
              <rect
                x={labelWidth}
                y={y}
                width={nortadaW}
                height={barHeight}
                rx={2}
                fill="#0ea5e9"
                opacity={0.85}
              />
              <rect
                x={labelWidth}
                y={y + barHeight + 4}
                width={otherW}
                height={barHeight}
                rx={2}
                fill="#f59e0b"
                opacity={0.85}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function MetricBreakdownChart({ model, scores, formatLabel }) {
  if (!scores?.overall) return null;
  const metrics = [
    { key: "speed", label: "Base speed", value: scores.overall.speed?.mae, color: "#059669" },
    { key: "gust", label: "Gusts", value: scores.overall.gust?.mae, color: "#d97706" },
    { key: "effective", label: "Effective", value: scores.overall.effective?.mae, color: "#0284c7" },
  ].filter((entry) => Number.isFinite(entry.value));

  if (metrics.length === 0) return null;
  const max = Math.max(...metrics.map((entry) => entry.value)) * 1.2;
  const width = 280;
  const height = 120;
  const barW = 48;
  const gap = 24;
  const originX = 40;

  return (
    <article className="rounded-md border border-ink/10 bg-ink/[0.02] p-4">
      <h4 className="text-sm font-medium">{formatLabel(model)}</h4>
      <p className="text-[11px] text-ink/50">Typical miss by metric (kt per hour)</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 w-full">
        {metrics.map((entry, index) => {
          const x = originX + index * (barW + gap);
          const barH = (entry.value / max) * 70;
          return (
            <g key={entry.key}>
              <rect
                x={x}
                y={height - 28 - barH}
                width={barW}
                height={barH}
                rx={3}
                fill={entry.color}
                opacity={0.85}
              />
              <text
                x={x + barW / 2}
                y={height - 10}
                textAnchor="middle"
                className="fill-ink/60 text-[9px]"
              >
                {entry.label}
              </text>
              <text
                x={x + barW / 2}
                y={height - 32 - barH}
                textAnchor="middle"
                className="fill-ink/80 text-[9px] font-medium"
              >
                {fmt(entry.value)}
              </text>
            </g>
          );
        })}
      </svg>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-ink/60">
        <div>
          <dt>Speed bias</dt>
          <dd className="tabular-nums text-ink/80">{fmt(scores.overall.speed?.bias)} kt</dd>
        </div>
        <div>
          <dt>Gust bias</dt>
          <dd className="tabular-nums text-ink/80">{fmt(scores.overall.gust?.bias)} kt</dd>
        </div>
        <div>
          <dt>Eff. bias</dt>
          <dd className="tabular-nums text-ink/80">{fmt(scores.overall.effective?.bias)} kt</dd>
        </div>
      </dl>
    </article>
  );
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function formatCorrelation(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "—";
}

/** Higher bar = better curve tracking. Values are correlation in [0, 1] typically. */
export function CurveCorrelationChart({
  title,
  subtitle,
  rows,
  valueKey,
  formatLabel,
  highlightKey,
}) {
  const values = rows.map((row) => row[valueKey]).filter(Number.isFinite);
  if (values.length === 0) return null;
  const best = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(0.15, best - min) * 1.2;

  return (
    <div>
      <p className="text-xs font-medium text-ink/60">{title}</p>
      {subtitle ? <p className="mt-0.5 text-[11px] text-ink/45">{subtitle}</p> : null}
      <ul className="mt-3 space-y-2">
        {rows.map((row, index) => {
          const value = row[valueKey];
          if (!Number.isFinite(value)) return null;
          const isWinner = highlightKey && row.key === highlightKey;
          const widthPct = Math.max(6, ((value - (best - span)) / span) * 100);
          return (
            <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm">
              <div className="min-w-0">
                <div
                  className={`truncate ${isWinner ? "font-semibold text-emerald-800" : "text-ink/80"}`}
                  title={formatLabel(row.key)}
                >
                  {formatLabel(row.key)}
                  {isWinner ? " · best" : ""}
                </div>
                <div className="mt-1 h-2 rounded-full bg-ink/5">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: isWinner ? "#059669" : modelColor(index),
                    }}
                  />
                </div>
              </div>
              <span className={`tabular-nums ${isWinner ? "font-semibold text-emerald-800" : "text-ink/70"}`}>
                {formatCorrelation(value)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DailyCurveSection({
  curveRanking,
  maeWinnerModel,
  byModel,
  formatLabel,
}) {
  if (!curveRanking?.length) return null;

  const curveWinner = curveRanking[0];
  const shapeRows = curveRanking.map((row) => ({
    key: row.model,
    value: row.shapeCorrelation,
  }));
  const rampRows = curveRanking.map((row) => ({
    key: row.model,
    value: row.rampCorrelation,
  }));

  const maeWinnerShape = byModel[maeWinnerModel]?.curve?.shape?.mean;
  const curveWinnerMae = byModel[curveWinner.model]?.overall?.effective?.mae;

  return (
    <section className="rounded-lg border border-ink/15 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold">Daily wind curve — does the forecast follow the day?</h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/70">
        Typical miss tells you how many knots wrong the model is on average. Curve score tells you whether it
        captures the <em>rhythm</em> of the day — ramp-up, peak, drop-off — hour by hour. A flat forecast can
        have decent miss stats but miss kick-in timing entirely.
      </p>

      {curveWinner.model !== maeWinnerModel ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <strong className="font-medium">Different leaders:</strong> {formatLabel(maeWinnerModel)} has the
          smallest typical miss
          {Number.isFinite(maeWinnerShape)
            ? ` (shape score ${formatCorrelation(maeWinnerShape)})`
            : ""}
          , but {formatLabel(curveWinner.model)} best tracks the intraday curve (
          {formatCorrelation(curveWinner.shapeCorrelation)}
          {Number.isFinite(curveWinnerMae) ? `, ~${curveWinnerMae.toFixed(2)} kt typical miss` : ""}).
        </p>
      ) : (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          {formatLabel(curveWinner.model)} leads on both typical miss and daily curve shape (
          {curveRanking[0].dayCount} days scored, ~{byModel[curveWinner.model]?.curve?.meanHoursPerDay ?? "—"}{" "}
          paired hours per day).
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <CurveCorrelationChart
          title="Intraday shape match"
          subtitle="Detrended correlation — ignores constant offset, focuses on the curve (1 = perfect)"
          rows={shapeRows}
          valueKey="value"
          formatLabel={formatLabel}
          highlightKey={curveWinner.model}
        />
        <CurveCorrelationChart
          title="Hour-to-hour changes"
          subtitle="Does the model predict when wind is building vs dropping? (1 = perfect)"
          rows={rampRows}
          valueKey="value"
          formatLabel={formatLabel}
          highlightKey={
            [...curveRanking]
              .filter((row) => Number.isFinite(row.rampCorrelation))
              .sort((a, b) => b.rampCorrelation - a.rampCorrelation)[0]?.model
          }
        />
      </div>
    </section>
  );
}

function bucketRows(regimeData, buckets) {
  return buckets.map((bucket) => ({
    key: bucket.id,
    label: bucket.label,
    count: regimeData.daysByBucket[bucket.id] ?? 0,
  }));
}

export function WindSpeedRegimeBreakdown({ climatology }) {
  if (!climatology?.buckets?.length) return null;

  const { buckets, nortada, nonNortada, totalDays } = climatology;
  const hasData = nortada.daysWithWind > 0 || nonNortada.daysWithWind > 0;
  if (!hasData) return null;

  return (
    <section className="rounded-lg border border-ink/15 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold">How windy is it, by direction?</h3>
      <p className="mt-1 text-xs leading-relaxed text-ink/55">
        Days counted by peak effective wind between 6am and 9pm. Nortada = wind from the north (300–40°).
        A day can appear in both columns when both direction patterns were observed.
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <RegimeWindBucketChart
          title="Nortada days"
          subtitle={`${nortada.daysWithWind} of ${totalDays} days with nortada hours`}
          rows={bucketRows(nortada, buckets)}
          barClassName="bg-sky-500"
          labelClassName="text-sky-950"
        />
        <RegimeWindBucketChart
          title="Non-nortada days"
          subtitle={`${nonNortada.daysWithWind} of ${totalDays} days with other-direction hours`}
          rows={bucketRows(nonNortada, buckets)}
          barClassName="bg-amber-500"
          labelClassName="text-amber-950"
        />
      </div>

      {climatology.monthly?.months?.length > 0 ? (
        <div className="mt-8 border-t border-ink/10 pt-6">
          <h4 className="text-xs font-semibold text-ink/80">By month</h4>
          <p className="mt-1 text-[11px] text-ink/50">
            Stacked columns — each bar is days in that month, split by peak effective wind band.
          </p>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <StackedWindDaysColumnChart
              title="Nortada by month"
              months={climatology.monthly.months}
              buckets={climatology.monthly.buckets}
              regimeKey="nortada"
            />
            <StackedWindDaysColumnChart
              title="Non-nortada by month"
              months={climatology.monthly.months}
              buckets={climatology.monthly.buckets}
              regimeKey="nonNortada"
            />
          </div>
          <WindSpeedBucketLegend buckets={climatology.monthly.buckets} />
        </div>
      ) : null}
    </section>
  );
}

function RegimeWindBucketChart({ title, subtitle, rows, barClassName, labelClassName }) {
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div>
      <p className={`text-xs font-semibold ${labelClassName}`}>{title}</p>
      <p className="mt-0.5 text-[11px] text-ink/50">{subtitle}</p>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => {
          const widthPct = row.count === 0 ? 0 : Math.max(8, (row.count / max) * 100);
          return (
            <li key={row.key} className="grid grid-cols-[4.5rem_minmax(0,1fr)_2rem] items-center gap-2 text-sm">
              <span className="text-xs text-ink/60">{row.label}</span>
              <div className="h-6 rounded bg-ink/5">
                {row.count > 0 ? (
                  <div
                    className={`flex h-full items-center rounded px-2 text-[11px] font-medium text-white ${barClassName}`}
                    style={{ width: `${widthPct}%` }}
                  >
                    {widthPct >= 28 ? `${row.count} days` : ""}
                  </div>
                ) : null}
              </div>
              <span className="text-right tabular-nums text-ink/70">{row.count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const WIND_SPEED_BUCKET_CHART_COLORS = {
  "0-10": "#94a3b8",
  "10-15": "#7dd3fc",
  "15-20": "#0ea5e9",
  "20-25": "#10b981",
  "25+": "#f59e0b",
};

function monthTotalDays(month, buckets, regimeKey) {
  return buckets.reduce((sum, bucket) => sum + (month[regimeKey][bucket.id] ?? 0), 0);
}

function StackedWindDaysColumnChart({ title, months, buckets, regimeKey }) {
  const barSlotWidth = 36;
  const width = Math.max(280, months.length * barSlotWidth + 40);
  const height = 240;
  const margin = { top: 12, right: 12, bottom: 36, left: 32 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const barGap = 6;
  const barWidth = Math.min(
    28,
    (plotWidth - barGap * Math.max(months.length - 1, 0)) / Math.max(months.length, 1)
  );
  const maxTotal = Math.max(...months.map((month) => monthTotalDays(month, buckets, regimeKey)), 1);

  return (
    <div>
      <p className="text-xs font-semibold text-ink/80">{title}</p>
      <div className="mt-2 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-full"
          role="img"
          aria-label={title}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = margin.top + plotHeight * (1 - tick);
            const value = Math.round(maxTotal * tick);
            return (
              <g key={tick}>
                <line
                  x1={margin.left}
                  x2={width - margin.right}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <text x={margin.left - 6} y={y + 3} textAnchor="end" fontSize={9} fill="#64748b">
                  {value}
                </text>
              </g>
            );
          })}

          {months.map((month, index) => {
            const x = margin.left + index * (barWidth + barGap);
            let stackTop = margin.top + plotHeight;

            return (
              <g key={month.monthKey}>
                {buckets.map((bucket) => {
                  const count = month[regimeKey][bucket.id] ?? 0;
                  const segmentHeight = (count / maxTotal) * plotHeight;
                  stackTop -= segmentHeight;
                  if (count === 0) return null;
                  return (
                    <rect
                      key={bucket.id}
                      x={x}
                      y={stackTop}
                      width={barWidth}
                      height={Math.max(segmentHeight, 1)}
                      fill={WIND_SPEED_BUCKET_CHART_COLORS[bucket.id]}
                      rx={1}
                    >
                      <title>{`${month.label}: ${count} days at ${bucket.label}`}</title>
                    </rect>
                  );
                })}
                <text
                  x={x + barWidth / 2}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#64748b"
                >
                  {month.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function WindSpeedBucketLegend({ buckets }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
      {buckets.map((bucket) => (
        <li key={bucket.id} className="flex items-center gap-1.5 text-[11px] text-ink/60">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: WIND_SPEED_BUCKET_CHART_COLORS[bucket.id] }}
          />
          {bucket.label}
        </li>
      ))}
    </ul>
  );
}
