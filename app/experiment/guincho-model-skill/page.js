import { loadGuinchoSkillSummary } from "../../../lib/forecast-experiment/loadGuinchoSkillSummary.js";
import GuinchoModelSkillView from "./GuinchoModelSkillView.js";

export const metadata = {
  title: "Which forecast calls the real sessions? | Waterman",
  description: "Which Guincho model catches the days Cabo Raso was windy, without calling days that were too light.",
};

function firstParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

function parseLead(value) {
  const lead = firstParam(value);
  return lead === "0" || lead === "2" ? lead : "1";
}

function parseHours(value) {
  return firstParam(value) === "rideable" ? "rideable" : "all";
}

function parseTab(value) {
  return firstParam(value) === "spot" ? "spot" : "findings";
}

function parseModel(value, allowed = []) {
  const model = firstParam(value);
  if (model && allowed.includes(model)) return model;
  return null;
}

export default async function GuinchoModelSkillPage({ searchParams }) {
  const params = await searchParams;
  const result = await loadGuinchoSkillSummary();
  const peerSet = result.ok ? result.summary?.peerSet ?? [] : [];
  return (
    <GuinchoModelSkillView
      initialSummary={result.ok ? result.summary : null}
      loadError={result.ok ? null : result.error}
      commands={result.commands}
      initialLeadDay={parseLead(params?.lead)}
      initialHoursMode={parseHours(params?.hours)}
      initialTab={parseTab(params?.tab)}
      initialModel={parseModel(params?.model, peerSet)}
    />
  );
}
