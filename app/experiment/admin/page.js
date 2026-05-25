"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function ExperimentAdminPage() {
  const summary = useQuery(api.forecastExperiment.debugSummary);

  if (!summary) {
    return <p className="text-ink/60">Loading experiment admin...</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink/60">
        Read-only debug view for the isolated forecast experiment (`fx_*` tables).
      </p>
      <section>
        <h2 className="text-lg font-semibold">Latest Predictions</h2>
        <pre className="mt-2 overflow-auto rounded border border-ink/15 bg-white p-3 text-xs">
          {JSON.stringify(summary.predictions, null, 2)}
        </pre>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Worker Runs</h2>
        <pre className="mt-2 overflow-auto rounded border border-ink/15 bg-white p-3 text-xs">
          {JSON.stringify(summary.workerRuns, null, 2)}
        </pre>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Skill Scores</h2>
        <pre className="mt-2 overflow-auto rounded border border-ink/15 bg-white p-3 text-xs">
          {JSON.stringify(summary.skillScores, null, 2)}
        </pre>
      </section>
    </div>
  );
}
