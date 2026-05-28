"use client";

import ModelSkillAnalysisView, {
  buildWindyNortadaSummary,
} from "../model-analysis/ModelSkillAnalysisView.js";

export default function WindyNortadaModelSkillPage() {
  return (
    <ModelSkillAnalysisView
      title="Which forecast is best on windy nortada days?"
      description="Same models as Model skill, but only nortada hours when the marina gauge read 15+ kt, on days that reached rideable nortada. Does filtering tighten forecast alignment?"
      apiFilter="windy-nortada"
      minKt={15}
      defaultSeasonId="2025"
      showWindClimatology={false}
      showComparison
      buildSummary={buildWindyNortadaSummary}
    />
  );
}
