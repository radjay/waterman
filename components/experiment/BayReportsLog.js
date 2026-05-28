"use client";

import {
  formatLisbonTime,
  formatRelativeMinutes,
  formatReportStatus,
} from "../../lib/forecast-experiment/userFacingCopy.js";

export function BayReportsLog({ reports }) {
  const count = reports?.length ?? 0;

  return (
    <details className="rounded-xl bg-white ring-1 ring-ink/10">
      <summary className="cursor-pointer list-none px-5 py-3 text-xs text-ink/45 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="font-medium text-ink/60">Bay reports</span>
        <span className="text-ink/40">{count === 0 ? " · none yet" : ` · ${count}`}</span>
      </summary>

      <div className="border-t border-ink/8">
        {count === 0 && (
          <p className="px-5 py-3 text-xs text-ink/40">No submissions yet.</p>
        )}
        {count > 0 && (
          <ul className="max-h-40 divide-y divide-ink/8 overflow-y-auto">
            {reports.map((report) => (
              <li key={report._id} className="px-5 py-2 text-xs">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-ink">{formatReportStatus(report.status)}</span>
                  <span className="shrink-0 tabular-nums text-ink/40">
                    {formatRelativeMinutes(report.reportedAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-ink/45">
                  {formatLisbonTime(report.reportedAt)}
                  {report.notes ? ` · ${report.notes}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
