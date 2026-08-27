"use client";

import { useMemo, useState } from "react";
import { CoverageStrip } from "../../../components/chart/CoverageStrip.js";
import { ForecastObsScatter } from "../../../components/chart/ForecastObsScatter.js";
import { RankingBars } from "../../../components/chart/RankingBars.js";
import { Loader } from "../../../components/common/Loader.js";
import { ScreenEmpty } from "../../../components/common/ScreenState.js";
import { Card } from "../../../components/ui/Card.js";
import { DetailsBlock } from "../../../components/ui/DetailsBlock.js";
import { FilterGroup } from "../../../components/ui/FilterGroup.js";
import { Heading } from "../../../components/ui/Heading.js";
import { MicroLabel } from "../../../components/ui/MicroLabel.js";
import { PillToggle } from "../../../components/ui/PillToggle.js";
import { SkillTable } from "../../../components/ui/SkillTable.js";
import { Text } from "../../../components/ui/Text.js";
import { WINDY_MODEL } from "../../../lib/forecast-experiment/guinchoModelSkillConstants.js";
import { GuinchoSpotCheck } from "./GuinchoSpotCheck.js";

const LEAD_OPTIONS = [
  { id: "0", label: "Same day" },
  { id: "1", label: "Yesterday" },
  { id: "2", label: "Two days ago" },
];

const HOURS_OPTIONS = [
  { id: "all", label: "All hours" },
  { id: "rideable", label: "Station was windy" },
];

const UNDER_TABLE_COLUMNS = [
  { key: "actualDays", label: "Real days", digits: 0 },
  { key: "hitDays", label: "Caught", digits: 0 },
  { key: "missedDays", label: "Missed", digits: 0 },
  { key: "falseGoDays", label: "False calls", digits: 0 },
  { key: "recallPct", label: "Caught, %", digits: 0 },
  { key: "falseGoDayPct", label: "False calls, %", digits: 0 },
  { key: "sessionF1Pct", label: "Match score, %", digits: 0 },
];

const GUSTINESS_TABLE_COLUMNS = [
  { key: "gustinessHours", label: "Windy hours scored", digits: 0 },
  { key: "gustinessMae", label: "Gustiness ratio off", digits: 2 },
  { key: "gustinessBias", label: "Too gusty / too smooth", digits: 2 },
];

const CONFIDENCE_LABELS = {
  "3": "All 3 models agreed",
  "2": "2 of 3 agreed",
  "1": "1 of 3 called it",
  "no-call": "Never reached a called day",
};

const CONFIDENCE_TABLE_COLUMNS = [
  { key: "days", label: "Days", digits: 0 },
  { key: "falseGoDayPct", label: "False calls, %", digits: 0 },
];

function confidenceRows(buckets) {
  return (buckets ?? []).map((bucket) => ({
    model: bucket.agreementBucket,
    label: CONFIDENCE_LABELS[bucket.agreementBucket] ?? bucket.agreementBucket,
    ...bucket,
  }));
}

function fmtKt(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "—";
}

function leadHeadline(leadDay) {
  if (leadDay === "0") return "Forecast from the same day";
  if (leadDay === "2") return "Forecast from two days ago";
  return "Forecast from yesterday";
}

function pickBest(rows, key) {
  const ranked = (rows ?? [])
    .filter((row) => Number.isFinite(row[key]) && !row.contextOnly)
    .sort((a, b) => a[key] - b[key]);
  const best = ranked[0];
  if (!best) return null;
  return { model: best.model, label: best.label, mae: best[key] };
}

function pickSafest(rows) {
  const eligible = (rows ?? []).filter(
    (row) =>
      !row.contextOnly &&
      ((row.actualDays ?? 0) > 0 ||
        (row.calledDays ?? 0) > 0 ||
        (row.actualHours ?? 0) > 0 ||
        (row.calledHours ?? 0) > 0)
  );
  eligible.sort((a, b) => {
    const aDay = Number.isFinite(a.sessionF1Pct) && a.actualDays > 0 ? a.sessionF1Pct : -Infinity;
    const bDay = Number.isFinite(b.sessionF1Pct) && b.actualDays > 0 ? b.sessionF1Pct : -Infinity;
    if (aDay !== bDay) return bDay - aDay;
    const aHour = Number.isFinite(a.hourF1Pct) && a.actualHours > 0 ? a.hourF1Pct : -Infinity;
    const bHour = Number.isFinite(b.hourF1Pct) && b.actualHours > 0 ? b.hourF1Pct : -Infinity;
    if (aHour !== bHour) return bHour - aHour;
    const aRecall = a.recallPct ?? a.hourRecallPct ?? -Infinity;
    const bRecall = b.recallPct ?? b.hourRecallPct ?? -Infinity;
    if (aRecall !== bRecall) return bRecall - aRecall;
    return (a.falseGoDayPct ?? a.falseGoPct ?? Infinity) - (b.falseGoDayPct ?? b.falseGoPct ?? Infinity);
  });
  const best = eligible[0];
  if (!best) return null;
  return { ...best };
}

function winnerFromTable(table) {
  const rows = (table?.rows ?? []).filter((row) => row.model !== WINDY_MODEL && !row.contextOnly);
  const overall = pickSafest(rows);
  const speed = pickBest(rows, "speedUnderMae");
  const gust = pickBest(rows, "gustUnderMae");
  if (!overall) return null;
  return {
    ...overall,
    hours: table?.hours ?? rows[0]?.hours ?? 0,
    agrees: Boolean(speed?.model && gust?.model && speed.model === gust.model),
    effective: overall,
    speed,
    gust,
  };
}

function pageHref({ leadDay, hoursMode, tab, model }) {
  const params = new URLSearchParams({ lead: leadDay, hours: hoursMode });
  if (tab === "spot") params.set("tab", "spot");
  if (model) params.set("model", model);
  return `?${params.toString()}#${tab === "spot" ? "models" : "picks"}`;
}

function SliceCard({ title, slice, note }) {
  if (!slice?.overall) return null;
  const f1 = slice.overall.sessionF1Pct ?? slice.overall.hourF1Pct;
  const valueKey = Number.isFinite(slice.overall.sessionF1Pct)
    ? "sessionF1Pct"
    : Number.isFinite(slice.overall.hourF1Pct)
      ? "hourF1Pct"
      : "falseGoDayPct";
  const higher = valueKey !== "falseGoDayPct";
  return (
    <Card radius="lg">
      <RankingBars
        title={title}
        rows={slice.rows ?? []}
        valueKey={valueKey}
        winnerKey={slice.overall.model}
        formatLabel={(row) => row.label}
        unit="%"
        digits={0}
        lowerIsBetter={!higher}
      />
      <p className="mt-3 text-[13px] text-faded-ink">
        {note} {slice.overall.label} matches real sessions best
        {Number.isFinite(f1) ? ` (${f1.toFixed(0)}% match).` : "."}
      </p>
    </Card>
  );
}

export default function GuinchoModelSkillView({
  initialSummary = null,
  loadError = null,
  commands = [],
  initialLeadDay = "1",
  initialHoursMode = "all",
  initialTab = "findings",
  initialModel = null,
}) {
  const summary = initialSummary;
  const [leadDay, setLeadDay] = useState(initialLeadDay);
  const [hoursMode, setHoursMode] = useState(initialHoursMode);
  const [tab, setTab] = useState(initialTab);
  const [selectedModel, setSelectedModel] = useState(initialModel ?? initialSummary?.winner?.model ?? null);

  const table = summary?.fullSeries?.byLead?.[leadDay]?.[hoursMode];
  const overlapTable = summary?.overlap?.byLead?.[leadDay]?.[hoursMode];
  const rankRows = table?.rows?.filter((row) => row.model !== WINDY_MODEL) ?? [];
  const winner = winnerFromTable(table);
  const overlapWinner = winnerFromTable(overlapTable);
  const tabOptions = [
    { id: "findings", label: "Findings", href: pageHref({ leadDay, hoursMode, tab: "findings" }) },
    { id: "spot", label: "Spot check", href: pageHref({ leadDay, hoursMode, tab: "spot" }) },
  ];
  const leadOptions = LEAD_OPTIONS.map((option) => ({
    ...option,
    href: pageHref({ leadDay: option.id, hoursMode, tab }),
  }));
  const hoursOptions = HOURS_OPTIONS.map((option) => ({
    ...option,
    href: pageHref({ leadDay, hoursMode: option.id, tab }),
  }));
  const leadMultiples = [0, 1, 2].map((day) => ({
    day,
    label: day === 0 ? "Same day" : day === 1 ? "Yesterday" : "Two days ago",
    rows: summary?.leadDayMae?.[hoursMode]?.[day] ?? [],
  }));
  const modelOptions = useMemo(() => {
    const slugs = summary?.peerSet ?? [];
    return slugs.map((model) => ({ id: model, label: summary.labels?.[model] ?? model }));
  }, [summary]);
  const chartModel = selectedModel ?? winner?.model ?? modelOptions[0]?.id ?? null;
  const scatterPoints = summary?.scatter?.[leadDay]?.[chartModel] ?? [];
  const scatterShown = scatterPoints;
  const skipped = summary?.skipped ?? [];
  const skippedLabels = [...new Set(skipped.map((row) => summary?.labels?.[row.model] ?? row.model))];

  if (!summary && !loadError) return <Loader />;

  if (loadError) {
    return (
      <ScreenEmpty
        title="No Guincho summary yet"
        body={`${loadError}${commands.length ? ` Run: ${commands.join(" && ")}` : ""}`}
      />
    );
  }

  const filterHours = table?.hours ?? 0;
  const hoursLabel = hoursMode === "rideable" ? "windy hours" : "all daytime hours";
  const slices = summary.breakdown?.byLead?.[leadDay]?.[hoursMode];

  return (
    <div className="space-y-8">
      <div>
        <MicroLabel>Guincho · Cabo Raso station</MicroLabel>
        <Heading level={1} className="mt-1">
          Which forecast calls the real sessions?
        </Heading>
        <Text variant="muted" className="mt-2 max-w-[70ch]">
          The job is to call every day Cabo Raso was at 12 kt or more, and not call days that were too light. Extra wind is easy: you rig smaller.
        </Text>
      </div>

      <PillToggle name="report-tab" animated={false} options={tabOptions} value={tab} onChange={setTab} />

      {tab === "spot" ? (
        <GuinchoSpotCheck
          summary={summary}
          modelOptions={modelOptions.map((option) => ({
            ...option,
            href: pageHref({ leadDay, hoursMode, tab: "spot", model: option.id }),
          }))}
          selectedModel={chartModel}
          onSelectModel={setSelectedModel}
        />
      ) : (
        <>
          <div id="picks" className="flex flex-col gap-3 scroll-mt-4 sm:flex-row sm:flex-wrap sm:items-center">
            <FilterGroup label="Forecast from">
              <PillToggle
                name="lead"
                animated={false}
                options={leadOptions}
                value={leadDay}
                onChange={setLeadDay}
              />
            </FilterGroup>
            <FilterGroup label="Hours">
              <PillToggle
                name="hours"
                animated={false}
                options={hoursOptions}
                value={hoursMode}
                onChange={setHoursMode}
              />
            </FilterGroup>
          </div>

          {winner ? (
            <Card variant="accent" radius="lg">
              <MicroLabel>
                {leadHeadline(leadDay)} · {winner.actualDays ?? winner.hours}{" "}
                {Number.isFinite(winner.actualDays) ? "real session days" : "hours"}
              </MicroLabel>
              <Heading level={2} className="mt-2">
                {`${winner.label} matches real sessions best`}
              </Heading>
              <div className="mt-4 flex flex-wrap gap-8">
                {Number.isFinite(winner.recallPct) ? (
                  <div>
                    <p className="font-data text-3xl tabular-nums text-ink">{winner.recallPct.toFixed(0)}%</p>
                    <p className="mt-1 text-[13px] text-faded-ink">Real days caught</p>
                  </div>
                ) : Number.isFinite(winner.hourRecallPct) ? (
                  <div>
                    <p className="font-data text-3xl tabular-nums text-ink">{winner.hourRecallPct.toFixed(0)}%</p>
                    <p className="mt-1 text-[13px] text-faded-ink">Real hours caught</p>
                  </div>
                ) : null}
                {Number.isFinite(winner.missedPct) ? (
                  <div>
                    <p className="font-data text-3xl tabular-nums text-ink">{winner.missedPct.toFixed(0)}%</p>
                    <p className="mt-1 text-[13px] text-faded-ink">Real days missed</p>
                  </div>
                ) : null}
                {Number.isFinite(winner.falseGoDayPct) ? (
                  <div>
                    <p className="font-data text-3xl tabular-nums text-ink">{winner.falseGoDayPct.toFixed(0)}%</p>
                    <p className="mt-1 text-[13px] text-faded-ink">False calls</p>
                  </div>
                ) : Number.isFinite(winner.falseGoPct) ? (
                  <div>
                    <p className="font-data text-3xl tabular-nums text-ink">{winner.falseGoPct.toFixed(0)}%</p>
                    <p className="mt-1 text-[13px] text-faded-ink">False call hours</p>
                  </div>
                ) : null}
              </div>
              <Text className="mt-3 max-w-[70ch]">
                {Number.isFinite(winner.actualDays)
                  ? `Cabo Raso had ${winner.actualDays} real days. ${winner.label} caught ${winner.hitDays ?? 0} (${Number.isFinite(winner.recallPct) ? winner.recallPct.toFixed(0) : "—"}%). It missed ${winner.missedDays ?? 0} and called ${winner.falseGoDays ?? 0} days that did not blow.`
                  : `${winner.label} matches the station hours best.`}
                {slices?.nortada?.overall && slices?.other?.overall
                  ? ` On the north wind (nortada), ${slices.nortada.overall.label} matches best. On other directions, ${slices.other.overall.label} does.`
                  : ""}
              </Text>
            </Card>
          ) : (
            <ScreenEmpty
              title="Not enough station hours"
              body="We need Cabo Raso readings in the same hours as the models."
            />
          )}

          {skippedLabels.length > 0 ? (
            <MicroLabel>No usable data: {skippedLabels.join(" · ")}</MicroLabel>
          ) : null}

          {filterHours === 0 ? (
            <ScreenEmpty title="No hours for this filter" body="Try a different forecast time or hour set." />
          ) : (
            <>
              {slices ? (
                <section className="space-y-3">
                  <Heading level={3}>When the wind changes</Heading>
                  <Text variant="muted" className="max-w-[70ch]">
                    Guincho’s nortada is strongest from late spring to early autumn. Here is who matches real sessions in that wind, in other directions, and in those months.
                  </Text>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <SliceCard
                      title="North wind"
                      slice={slices.nortada}
                      note="Hours when Cabo Raso wind is from the north."
                    />
                    <SliceCard
                      title="Other directions"
                      slice={slices.other}
                      note="Hours when the wind is not from the north."
                    />
                    <SliceCard title="May–September" slice={slices.maySep} note="Nortada season." />
                    <SliceCard title="October–April" slice={slices.octApr} note="The rest of the year." />
                  </div>
                </section>
              ) : null}

              <DetailsBlock title="Every model" caption={`Caught real days, missed real days, and false calls, for ${hoursLabel}.`}>
                <div className="grid gap-4 lg:grid-cols-3">
                  <RankingBars
                    title="Match score"
                    rows={rankRows.filter((row) => Number.isFinite(row.sessionF1Pct))}
                    valueKey="sessionF1Pct"
                    winnerKey={winner?.model}
                    formatLabel={(row) => row.label}
                    unit="%"
                    digits={0}
                    lowerIsBetter={false}
                  />
                  <RankingBars
                    title="Real days caught"
                    rows={rankRows.filter((row) => Number.isFinite(row.recallPct))}
                    valueKey="recallPct"
                    winnerKey={winner?.model}
                    formatLabel={(row) => row.label}
                    unit="%"
                    digits={0}
                    lowerIsBetter={false}
                  />
                  <RankingBars
                    title="False calls"
                    rows={rankRows.filter((row) => Number.isFinite(row.falseGoDayPct))}
                    valueKey="falseGoDayPct"
                    winnerKey={winner?.model}
                    formatLabel={(row) => row.label}
                    unit="%"
                    digits={0}
                  />
                </div>
              </DetailsBlock>

              <DetailsBlock
                title="Gustiness match"
                caption="Gustiness ratio = gust / steady wind. This does not change which model wins the session call -- it is a separate read on how gusty a called session actually feels, scored on windy hours only."
              >
                <SkillTable
                  caption="A blank ECMWF row means this archive has no ECMWF gust field to score -- not that Guincho was calm."
                  rows={table.rows}
                  columns={GUSTINESS_TABLE_COLUMNS}
                />
              </DetailsBlock>

              <DetailsBlock
                title="The numbers"
                caption={`Same ${filterHours} hours for every model.`}
              >
                <SkillTable
                  caption="Caught = real days the model also called. Missed = real days it skipped. False calls = days it called that did not blow."
                  rows={table.rows}
                  winnerModel={winner?.model}
                  columns={UNDER_TABLE_COLUMNS}
                />
              </DetailsBlock>

              <DetailsBlock
                title="What we showed in the app"
                caption={
                  overlapTable?.windyPeer
                    ? `Windy’s blended Guincho line on the same ${overlapTable.hours} hours.`
                    : `Not enough overlapping hours to rank the old Windy line (${overlapTable?.hours ?? 0} hours).`
                }
              >
                <SkillTable
                  rows={overlapTable?.rows ?? []}
                  winnerModel={overlapWinner?.model}
                  columns={UNDER_TABLE_COLUMNS}
                />
              </DetailsBlock>

              {summary.blendLeaderboard?.byLead?.[leadDay] ? (
                <DetailsBlock
                  title="Blend leaderboard"
                  caption="Router, vote, and averaged blends of the open models, scored the same way as any single model."
                >
                  <SkillTable
                    caption="Rows marked Rule are not a fetched model -- they are a router, vote, or average built from the models above."
                    rows={summary.blendLeaderboard.byLead[leadDay].rows}
                    winnerModel={summary.blendLeaderboard.byLead[leadDay].rows[0]?.model}
                    columns={UNDER_TABLE_COLUMNS}
                  />
                </DetailsBlock>
              ) : null}

              <DetailsBlock
                title="Does agreement mean confidence?"
                caption="When the three vote members agree, is the call more reliable? Days grouped by how many of the three called each go hour."
              >
                <SkillTable
                  caption="“Never reached a called day” is a distinct bucket, not a weaker reliability score -- the vote group called no session at all that day, so its False calls, % is 0 by construction, not evidence of accuracy."
                  rows={confidenceRows(summary.confidence?.byLead?.[leadDay])}
                  columns={CONFIDENCE_TABLE_COLUMNS}
                />
              </DetailsBlock>

              <DetailsBlock title="Same day, yesterday, two days ago" caption="Does extra notice still catch the real days?">
                <div className="grid gap-4 lg:grid-cols-3">
                  {leadMultiples.map(({ day, label, rows }) => (
                    <RankingBars
                      key={day}
                      title={label}
                      rows={rows.filter((row) => row.model !== WINDY_MODEL && Number.isFinite(row.sessionF1Pct))}
                      valueKey="sessionF1Pct"
                      winnerKey={[...rows].sort((a, b) => (b.sessionF1Pct ?? -1) - (a.sessionF1Pct ?? -1))[0]?.model}
                      formatLabel={(row) => row.label}
                      unit="%"
                      digits={0}
                      lowerIsBetter={false}
                    />
                  ))}
                </div>
              </DetailsBlock>

              <DetailsBlock title="Each hour as a dot" caption="Below the dashed line = the model was too strong.">
                {modelOptions.length > 0 ? (
                  <FilterGroup label="Model" className="mb-3">
                    <PillToggle
                      name="scatter-model"
                      animated={false}
                      options={modelOptions.map((option) => ({
                        ...option,
                        href: pageHref({ leadDay, hoursMode, tab: "findings", model: option.id }),
                      }))}
                      value={chartModel}
                      onChange={setSelectedModel}
                    />
                  </FilterGroup>
                ) : null}
                <ForecastObsScatter
                  points={scatterShown}
                  title="Each dot is one hour"
                  caption="Below the line = the model was too strong. That is the miss that costs a session."
                />
              </DetailsBlock>

              <DetailsBlock title="When the station was up" caption="Filled months have Cabo Raso hours we could score.">
                <CoverageStrip months={summary.coverage ?? []} />
              </DetailsBlock>
            </>
          )}
        </>
      )}
    </div>
  );
}
