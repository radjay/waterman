/** Fixed summer windows for model skill analysis (May–Sep, no free-form date picker). */

export const SUMMER_SEASON_YEARS = [2024, 2025, 2026];

/**
 * Years that have usable marina observations (Windguru 2329) for high-confidence
 * kick-in labels and backtesting. 2026+ has no new marina data while the sensor is offline.
 */
export const MARINA_LABEL_YEARS = [2024, 2025];

export function summerSeasonRange(year) {
  return {
    startDateLocal: `${year}-05-01`,
    endDateLocal: `${year}-09-30`,
  };
}

function buildSeasonEntry(year) {
  return {
    id: String(year),
    label: `Summer ${year}`,
    ranges: [summerSeasonRange(year)],
    hasMarinaLabels: MARINA_LABEL_YEARS.includes(year),
  };
}

export const ANALYSIS_SEASONS = {
  // "Average" for label-sensitive work (backtest, ML training, prediction scoring)
  // only includes years with actual marina observations.
  average: {
    id: "average",
    label: "Average (2024–2025)",
    ranges: MARINA_LABEL_YEARS.map(summerSeasonRange),
    hasMarinaLabels: true,
  },
  ...Object.fromEntries(SUMMER_SEASON_YEARS.map((year) => [String(year), buildSeasonEntry(year)])),
};

export const DEFAULT_ANALYSIS_SEASON_ID = "average";

export function resolveAnalysisSeason(seasonId) {
  return ANALYSIS_SEASONS[seasonId] ?? ANALYSIS_SEASONS[DEFAULT_ANALYSIS_SEASON_ID];
}

export function listAnalysisSeasonOptions() {
  return [
    ANALYSIS_SEASONS.average,
    ...SUMMER_SEASON_YEARS.map((year) => ANALYSIS_SEASONS[String(year)]),
  ];
}

/** Dates in any configured range (excludes winter between summers). */
export function filterDatesToSeasonRanges(datesLocal, ranges) {
  return datesLocal.filter((dateLocal) =>
    ranges.some(
      (range) => dateLocal >= range.startDateLocal && dateLocal <= range.endDateLocal
    )
  );
}

/** Ranges suitable for label-sensitive work (backtests, ML training, prediction scoring). */
export function getMarinaLabelSeasonRanges() {
  return MARINA_LABEL_YEARS.map(summerSeasonRange);
}

/** Whether a season id has high-confidence marina observations for labels. */
export function seasonHasMarinaLabels(seasonId) {
  if (seasonId === "average") return true; // our Average is now 2024-2025 only
  const year = Number(seasonId);
  return MARINA_LABEL_YEARS.includes(year);
}
