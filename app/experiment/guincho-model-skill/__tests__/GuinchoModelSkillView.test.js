import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import GuinchoModelSkillView from "../GuinchoModelSkillView";

function underRow(extra) {
  return {
    actualDays: 80,
    calledDays: 80,
    hitDays: 64,
    missedDays: 16,
    missedPct: 20,
    recallPct: 80,
    precisionPct: 80,
    sessionF1Pct: 80,
    hourF1Pct: 80,
    hourRecallPct: 80,
    actualHours: 40,
    hitHours: 32,
    calledHours: 40,
    falseGoHours: 8,
    falseGoDays: 2,
    falseGoDayPct: 20,
    falseGoPct: 20,
    underMae: 2,
    speedUnderMae: 2,
    gustUnderMae: 2,
    mae: 3,
    speedMae: 3,
    gustMae: 3,
    ...extra,
  };
}

const yesterdayRows = [
  underRow({
    model: "gfs-global",
    label: "GFS",
    sessionF1Pct: 88,
    recallPct: 90,
    hitDays: 72,
    missedDays: 8,
    missedPct: 10,
    falseGoDayPct: 12,
    falseGoDays: 10,
    calledDays: 82,
    underMae: 1.5,
    speedUnderMae: 1.2,
    gustUnderMae: 2.8,
  }),
  underRow({
    model: "icon-eu",
    label: "ICON7",
    sessionF1Pct: 70,
    recallPct: 95,
    hitDays: 76,
    missedDays: 4,
    missedPct: 5,
    falseGoDayPct: 22,
    falseGoDays: 22,
    calledDays: 100,
    underMae: 2.1,
  }),
  underRow({
    model: "icon-global",
    label: "ICON13",
    sessionF1Pct: 78,
    recallPct: 85,
    falseGoDayPct: 18,
    falseGoDays: 14,
    calledDays: 80,
    underMae: 1.8,
    speedUnderMae: 2.4,
    gustUnderMae: 1.0,
  }),
];

const sameDayRows = [
  underRow({
    model: "icon-eu",
    label: "ICON7",
    actualDays: 12,
    calledDays: 12,
    hitDays: 11,
    missedDays: 1,
    missedPct: 8,
    recallPct: 92,
    sessionF1Pct: 92,
    hourF1Pct: 92,
    falseGoDayPct: 8,
    falseGoDays: 1,
    underMae: 1.1,
    speedUnderMae: 1.1,
    gustUnderMae: 1.1,
  }),
];

const table = (rows) => ({ hours: 12, rows });

const summary = {
  winner: {
    model: "gfs-global",
    label: "GFS",
    mae: 1.5,
    hours: 12,
    agrees: false,
    speed: { model: "gfs-global", label: "GFS", mae: 1.2 },
    gust: { model: "icon-global", label: "ICON13", mae: 1.0 },
    effective: { model: "gfs-global", label: "GFS", mae: 1.5 },
  },
  peerSet: ["icon-eu", "gfs-global", "icon-global"],
  labels: { "icon-eu": "ICON7", "gfs-global": "GFS", "icon-global": "ICON13" },
  skipped: [],
  fullSeries: {
    byLead: {
      0: { all: table(sameDayRows), rideable: table(sameDayRows) },
      1: { all: table(yesterdayRows), rideable: table(yesterdayRows) },
    },
  },
  overlap: { byLead: { 1: { all: { hours: 0, rows: [], windyPeer: false } } } },
  leadDayMae: { rideable: { 0: [], 1: [], 2: [] }, all: { 0: [], 1: [], 2: [] } },
  scatter: {},
  sampleDays: [],
  coverage: [],
};

describe("GuinchoModelSkillView", () => {
  it("shows the empty state and fetch commands when the summary is missing", () => {
    render(
      <GuinchoModelSkillView
        loadError="Summary file is missing. Fetch Open-Meteo runs, then score."
        commands={["npm run fx:fetch:openmeteo-guincho", "npm run fx:analyze:guincho-skill"]}
      />
    );
    expect(screen.getByText("No Guincho summary yet")).toBeTruthy();
    expect(screen.getByText(/fx:analyze:guincho-skill/)).toBeTruthy();
  });

  it("answers with a combo when base and gust disagree", () => {
    render(<GuinchoModelSkillView initialSummary={summary} />);
    expect(screen.getByRole("heading", { name: "Which forecast calls the real sessions?" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "GFS matches real sessions best" })).toBeTruthy();
    expect(screen.getByText(/Cabo Raso had 80 real days/)).toBeTruthy();
    expect(screen.getByText(/GFS caught 72/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Same day" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Spot check" })).toBeTruthy();
    expect(screen.getByText("The numbers").closest("details").open).toBe(false);
  });

  it("shows north-wind and season splits", () => {
    render(
      <GuinchoModelSkillView
        initialSummary={{
          ...summary,
          breakdown: {
            byLead: {
              1: {
                all: {
                  nortada: {
                    hours: 10,
                    rows: [{ model: "icon-eu", label: "ICON7", sessionF1Pct: 82, falseGoDayPct: 10, underMae: 1.4 }],
                    overall: { model: "icon-eu", label: "ICON7", sessionF1Pct: 82, falseGoDayPct: 10, underMae: 1.4 },
                  },
                  other: {
                    hours: 8,
                    rows: [{ model: "gfs-global", label: "GFS", sessionF1Pct: 84, falseGoDayPct: 8, underMae: 1.2 }],
                    overall: { model: "gfs-global", label: "GFS", sessionF1Pct: 84, falseGoDayPct: 8, underMae: 1.2 },
                  },
                  maySep: {
                    hours: 9,
                    rows: [{ model: "icon-eu", label: "ICON7", sessionF1Pct: 80, falseGoDayPct: 11, underMae: 1.5 }],
                    overall: { model: "icon-eu", label: "ICON7", falseGoDayPct: 11, underMae: 1.5 },
                  },
                  octApr: {
                    hours: 7,
                    rows: [{ model: "gfs-global", label: "GFS", sessionF1Pct: 81, falseGoDayPct: 9, underMae: 1.3 }],
                    overall: { model: "gfs-global", label: "GFS", falseGoDayPct: 9, underMae: 1.3 },
                  },
                },
              },
            },
          },
        }}
      />
    );
    expect(screen.getByText("North wind")).toBeTruthy();
    expect(screen.getByText("May–September")).toBeTruthy();
    expect(screen.getByText(/On the north wind \(nortada\), ICON7 matches best/)).toBeTruthy();
  });

  it("changes the answer when the lead picker changes", () => {
    render(<GuinchoModelSkillView initialSummary={summary} />);
    expect(screen.getByRole("heading", { name: "GFS matches real sessions best" })).toBeTruthy();
    expect(screen.getByText(/Forecast from yesterday/)).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: "Same day" }));
    expect(screen.getByRole("heading", { name: "ICON7 matches real sessions best" })).toBeTruthy();
    expect(screen.getByText(/Forecast from the same day/)).toBeTruthy();
    expect(screen.getAllByText("8%").length).toBeGreaterThan(0);
  });

  it("shows the blend leaderboard with a Rule badge on synthetic rows", () => {
    render(
      <GuinchoModelSkillView
        initialSummary={{
          ...summary,
          blendLeaderboard: {
            byLead: {
              1: {
                hours: 12,
                rows: [
                  underRow({ model: "router-consensus", label: "Router (direction)", synthetic: true, sessionF1Pct: 90 }),
                  ...yesterdayRows,
                ],
              },
            },
          },
        }}
      />
    );
    expect(screen.getByText("Blend leaderboard")).toBeTruthy();
    expect(screen.getByText("Router (direction)")).toBeTruthy();
    expect(screen.getAllByText("Rule").length).toBeGreaterThan(0);
  });

  it("does not render the blend leaderboard when the summary lacks it", () => {
    render(<GuinchoModelSkillView initialSummary={summary} />);
    expect(screen.queryByText("Blend leaderboard")).toBeNull();
  });

  it("opens the spot check and switches the model on every chart", () => {
    render(
      <GuinchoModelSkillView
        initialSummary={{
          ...summary,
          spotChecks: [
            {
              id: "nortada-maySep",
              title: "North wind · May–September",
              note: "Nortada season.",
              dates: ["2025-08-20"],
            },
          ],
          sampleDays: [
            {
              dateLocal: "2025-08-20",
              hours: [
                {
                  hourLocal: 10,
                  observedSpeed: 12,
                  observedGust: 18,
                  models: {
                    "icon-eu": { speed: 11, gust: 16 },
                    "gfs-global": { speed: 14, gust: 20 },
                  },
                },
                {
                  hourLocal: 13,
                  observedSpeed: 16,
                  observedGust: 24,
                  models: {
                    "icon-eu": { speed: 15, gust: 22 },
                    "gfs-global": { speed: 17, gust: 25 },
                  },
                },
              ],
            },
          ],
        }}
      />
    );
    fireEvent.click(screen.getByRole("link", { name: "Spot check" }));
    expect(screen.getByText("North wind · May–September")).toBeTruthy();
    expect(screen.getByText(/20 Aug 2025 · GFS/)).toBeTruthy();
    const icon = screen.getByRole("link", { name: "ICON7" });
    expect(icon.getAttribute("href")).toMatch(/model=icon-eu/);
    fireEvent.click(icon);
    expect(screen.getByText(/20 Aug 2025 · ICON7/)).toBeTruthy();
  });
});

describe("Guincho page client graph", () => {
  it("does not import the scorer into the browser view", () => {
    const source = readFileSync(join(import.meta.dirname, "..", "GuinchoModelSkillView.js"), "utf8");
    expect(source).not.toMatch("guinchoModelSkill.js");
    expect(source).not.toMatch("modelSkillAnalysis.js");
    expect(source).not.toMatch("guinchoArchive.js");
    expect(source).toMatch("guinchoModelSkillConstants.js");
  });
});
