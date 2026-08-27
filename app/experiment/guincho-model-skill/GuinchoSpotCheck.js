"use client";

import { SampleDayWind } from "../../../components/chart/SampleDayWind.js";
import { ScreenEmpty } from "../../../components/common/ScreenState.js";
import { Badge } from "../../../components/ui/Badge.js";
import { Card } from "../../../components/ui/Card.js";
import { FilterGroup } from "../../../components/ui/FilterGroup.js";
import { Heading } from "../../../components/ui/Heading.js";
import { MicroLabel } from "../../../components/ui/MicroLabel.js";
import { PillToggle } from "../../../components/ui/PillToggle.js";
import { Text } from "../../../components/ui/Text.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDay(dateLocal) {
  const [year, month, day] = String(dateLocal).split("-");
  const monthName = MONTHS[Number(month) - 1];
  if (!monthName || !day) return dateLocal;
  return `${Number(day)} ${monthName} ${year}`;
}

function rememberModel(model) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("tab", "spot");
  url.searchParams.set("model", model);
  url.hash = "models";
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function GuinchoSpotCheck({ summary, modelOptions, selectedModel, onSelectModel }) {
  const chartModel = selectedModel ?? modelOptions[0]?.id ?? null;
  const modelLabel = summary?.labels?.[chartModel] ?? chartModel;
  const daysByDate = Object.fromEntries((summary?.sampleDays ?? []).map((day) => [day.dateLocal, day]));
  const buckets = (summary?.spotChecks ?? []).filter((bucket) => bucket.dates?.length);

  function selectModel(model) {
    onSelectModel(model);
    rememberModel(model);
  }

  if (!chartModel || buckets.length === 0) {
    return <ScreenEmpty title="No sample days" body="Score the archive again to fill the spot check." />;
  }

  return (
    <div id="spot" className="space-y-8 scroll-mt-4">
      <Text variant="muted" className="max-w-[70ch]">
        Each chart is one day. Columns are the forecast from yesterday. Lines are the Cabo Raso station. The set leans toward days a model missed a real session, or called one that did not blow.
      </Text>
      <div id="models" className="sticky top-0 z-20 isolate -mx-4 px-4 py-3 bg-page">
        <FilterGroup label="Model">
          <PillToggle
            name="spot-model"
            animated={false}
            options={modelOptions}
            value={chartModel}
            onChange={selectModel}
          />
        </FilterGroup>
      </div>
      {buckets.map((bucket) => (
        <section key={bucket.id} className="space-y-3">
          <div>
            <Heading level={3}>{bucket.title}</Heading>
            <Text variant="muted">
              {bucket.note} {bucket.dates.length} days.
            </Text>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {bucket.dates.map((date) => {
              const day = daysByDate[date];
              if (!day) return null;
              const falseSession = Boolean(day.falseSessionByModel?.[chartModel]);
              const missedSession = Boolean(day.missedSessionByModel?.[chartModel]);
              return (
                <Card key={date} radius="lg">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <MicroLabel>
                      {formatDay(date)} · {modelLabel}
                    </MicroLabel>
                    {falseSession ? <Badge variant="accent">False call</Badge> : null}
                    {missedSession ? <Badge variant="marginal">Missed session</Badge> : null}
                  </div>
                  <SampleDayWind
                    hours={day.hours}
                    modelKey={chartModel}
                    modelLabel={modelLabel}
                    compact
                  />
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
