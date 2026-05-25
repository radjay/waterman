"use client";

import ModelSkillAnalysisView from "../model-analysis/ModelSkillAnalysisView.js";

const DEFAULT_START = "2025-05-01";
const DEFAULT_END = "2025-09-30";

const RANGE_PRESETS = [
  { label: "Summer 2025", start: "2025-05-01", end: "2025-09-30" },
  { label: "Oct–Mar", start: "2025-10-01", end: "2026-03-31" },
  { label: "All data", start: "2025-05-01", end: "2026-05-25" },
];

export default function ModelSkillPage() {
  return (
    <ModelSkillAnalysisView
      title="Which forecast is best?"
      description="We compare old forecasts to the CNC Foil wind gauge. Smaller number = closer to reality."
      defaultStart={DEFAULT_START}
      defaultEnd={DEFAULT_END}
      rangePresets={RANGE_PRESETS}
    />
  );
}
