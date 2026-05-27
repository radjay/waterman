"use client";

import ModelSkillAnalysisView from "./ModelSkillAnalysisView.js";

export default function ModelSkillPage() {
  return (
    <ModelSkillAnalysisView
      title="Which forecast is best?"
      description="We compare old forecasts to the CNC Foil wind gauge. Smaller number = closer to reality."
    />
  );
}
