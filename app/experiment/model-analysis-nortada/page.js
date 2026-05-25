"use client";

import ModelSkillAnalysisView, {
  buildWindyNortadaSummary,
} from "../model-analysis/ModelSkillAnalysisView.js";

const DEFAULT_START = "2025-05-01";
const DEFAULT_END = "2025-09-30";

const RANGE_PRESETS = [{ label: "Summer 2025", start: "2025-05-01", end: "2025-09-30" }];

export default function WindyNortadaModelSkillPage() {
  return (
    <ModelSkillAnalysisView
      title="Which forecast is best on windy nortada days?"
      description="Same models as Model skill, but only nortada hours when the marina gauge read 15+ kt, on days that reached rideable nortada. Does filtering tighten forecast alignment?"
      apiFilter="windy-nortada"
      minKt={15}
      defaultStart={DEFAULT_START}
      defaultEnd={DEFAULT_END}
      rangePresets={RANGE_PRESETS}
      showWindClimatology={false}
      showComparison
      buildSummary={buildWindyNortadaSummary}
    />
  );
}
