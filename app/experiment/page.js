"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { BayForecastDashboard } from "../../components/experiment/BayForecastDashboard.js";

export default function ExperimentDashboardPage() {
  const dashboard = useQuery(api.forecastExperiment.experimentDashboard);

  if (!dashboard) {
    return <p className="py-16 text-center text-sm text-ink/40">Loading…</p>;
  }

  return <BayForecastDashboard dashboard={dashboard} />;
}
