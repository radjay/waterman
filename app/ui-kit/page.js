"use client";

import { useState } from "react";
import { ArrowRight, Plus, Trash2, Settings, Wind } from "lucide-react";

import { useTheme } from "../../components/theme/ThemeProvider";

// — Current —
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Divider } from "../../components/ui/Divider";
import { Heading } from "../../components/ui/Heading";
import { Text } from "../../components/ui/Text";
import { Arrow } from "../../components/ui/Arrow";
import { Metric } from "../../components/ui/Metric";
import { DataGroup } from "../../components/ui/DataGroup";
import { ConditionLine } from "../../components/ui/ConditionLine";
import { ScoreDial, ScoreDialEmpty } from "../../components/ui/ScoreDial";
import { MicroLabel } from "../../components/ui/MicroLabel";
import { DayTag } from "../../components/ui/DayTag";
import { DayTrack } from "../../components/ui/DayTrack";
import { SwipeDots } from "../../components/ui/SwipeDots";
import { WindLine } from "../../components/ui/WindLine";
import { CamFrame } from "../../components/ui/CamFrame";
import { SpotRow } from "../../components/spot/SpotRow";
import { SpotDayRow } from "../../components/spot/SpotDayRow";
import { SpotPickerSheet, SpotTitle } from "../../components/spot/SpotPickerSheet";
import { LiveCard, LiveLegend } from "../../components/live/LiveCard";
import { SportSegmented } from "../../components/sport/SportSegmented";
import { WindBand } from "../../components/chart/WindBand";
import { WaveTideBand, waveTidePresence } from "../../components/chart/WaveTideBand";
import { ScoreBand } from "../../components/chart/ScoreBand";
import { DayChartPanel } from "../../components/chart/DayChartPanel";
import { TimeAxis } from "../../components/chart/TimeAxis";
import {
  BandHeader,
  WIND_LIVE_LEGEND,
  waveTideLabel,
  waveTideLegend,
} from "../../components/chart/BandHeader";
import { ScreenError, ScreenEmpty } from "../../components/common/ScreenState";
import { SportBadge } from "../../components/ui/SportBadge";
import { SportFilter } from "../../components/ui/SportFilter";
import { FilterGroup } from "../../components/ui/FilterGroup";
import { ShareButton } from "../../components/ui/ShareButton";
import { LabsSection } from "../../components/ui/LabsSection";
import { SportFilterChip } from "../../components/sport/SportFilterChip";
import { WindowCard } from "../../components/next/WindowCard";
import { WeekStrip } from "../../components/next/WeekStrip";
import { EvidenceStack, InTheWaterCard } from "../../components/now/EvidenceStack";
import { HourByHour } from "../../components/confidence/HourByHour";
import { ScoreFactors } from "../../components/confidence/ScoreFactors";
import { ModelGrid } from "../../components/confidence/ModelGrid";
import { LiveWindIndicator } from "../../components/wind/LiveWindIndicator";
import { WindGroup } from "../../components/forecast/WindGroup";
import { WaveGroup } from "../../components/forecast/WaveGroup";
import { DirectionIndicator } from "../../components/forecast/DirectionIndicator";
import { Loader } from "../../components/common/Loader";
import { EmptyState } from "../../components/common/EmptyState";
import { primaryMetric } from "../../lib/conditions";

// — Legacy —
import { Card } from "../../components/ui/Card";
import { ScoreCard } from "../../components/ui/ScoreCard";
import { ScoreDisplay } from "../../components/ui/ScoreDisplay";
import { Section } from "../../components/ui/Section";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { PillToggle } from "../../components/ui/PillToggle";
import { Tooltip } from "../../components/ui/Tooltip";
import { TideDisplay } from "../../components/tide/TideDisplay";

import {
  SPOTS,
  WINDOWS,
  WEEK,
  WEEK_CHART,
  WEEK_DAYS,
  HOUR_SLOTS,
  FACTORS,
  STATION,
  STATION_TRAIL,
  RIDER_COUNT,
  MODEL_COLUMNS,
  CHART,
  CHART_NOW,
  TIDES,
  PACK,
  PACK_NO_STATION,
  SPOT_DAY,
  T0,
  slot,
} from "./fixtures";

/* ------------------------------------------------------------------ chrome */

/**
 * Night/Day switch. A review control, not a product feature — the app follows
 * local sunrise/sunset with an Auto/Night/Day preference in Settings. Having it
 * here is what makes both themes checkable in one pass.
 */
function ThemeSwitch() {
  const { theme, preference, setPreference } = useTheme();
  return (
    <div className="flex items-center gap-3">
      <span className="font-data text-[10px] tracking-label-wide text-dim uppercase">Theme</span>
      <div className="flex rounded-pill overflow-hidden border border-nav-border">
        {["auto", "night", "day"].map((p) => (
          <button
            key={p}
            onClick={() => setPreference(p)}
            className={`px-4 py-2 font-data text-[10px] tracking-[0.12em] uppercase transition-colors duration-fast ease-smooth ${
              preference === p ? "bg-accent text-page" : "text-faded-ink hover:bg-ink-hover"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <span className="font-data text-[10px] text-dim">resolved: {theme}</span>
    </div>
  );
}

/**
 * Where a component is actually used. The kit's job is not only to show what
 * exists but to say what is load-bearing — a component with no chips is a
 * component nothing depends on, and that is the first thing worth knowing
 * before building on it.
 */
function Usage({ on = [], note }) {
  if (on.length === 0 && !note) return null;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {on.map((r) => (
        <span
          key={r}
          className="font-data text-[8px] tracking-label uppercase px-1.5 py-0.5 rounded-pill border border-card text-dim"
        >
          {r}
        </span>
      ))}
      {note && <span className="font-data text-[9px] text-dim">{note}</span>}
    </span>
  );
}

function Part({ id, title, blurb, tone = "current", children }) {
  return (
    <section id={id} className="mb-16 scroll-mt-6">
      <div
        className={`rounded-card-lg border px-5 py-4 mb-8 ${
          tone === "legacy"
            ? "border-marginal/30 bg-marginal/10"
            : "border-accent-border bg-accent-tint-card"
        }`}
      >
        <h2 className="font-headline text-[28px] font-extrabold tracking-display-tight text-ink">
          {title}
        </h2>
        <p className="text-[13px] leading-[1.5] text-faded-ink mt-1.5 max-w-[70ch]">{blurb}</p>
      </div>
      {children}
    </section>
  );
}

function KitSection({ id, title, blurb, children }) {
  return (
    <div className="mb-12 scroll-mt-6" id={id}>
      <h3 className="font-headline text-xl font-bold text-ink mb-1">{title}</h3>
      {blurb && (
        <p className="text-[13px] leading-[1.5] text-faded-ink mb-3 max-w-[70ch]">{blurb}</p>
      )}
      <Divider weight="heavy" className="mb-6" />
      {children}
    </div>
  );
}

function Row({ label, importPath, on, note, full = false, children }) {
  return (
    <div className="mb-7">
      <div className={`mb-2 ${full ? "" : "flex flex-wrap items-center gap-4"}`}>{children}</div>
      <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
        <span className="font-body text-xs text-faded-ink">{label}</span>
        {importPath && (
          <code className="font-data text-[10px] text-dim bg-ink-hover px-1.5 py-0.5 rounded">
            {importPath}
          </code>
        )}
        <Usage on={on} note={note} />
      </div>
    </div>
  );
}

function Swatch({ className, name }) {
  return (
    <div>
      <div className={`h-14 rounded-card mb-2 ${className}`} />
      <span className="font-data text-[10px] text-dim">{name}</span>
    </div>
  );
}

/** A component we deliberately do not render — video, portals, or page chrome. */
function Documented({ name, importPath, on, children }) {
  return (
    <div className="mb-5 rounded-card-sm border border-card bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="font-headline font-bold text-[14px] text-ink">{name}</span>
        <code className="font-data text-[10px] text-dim bg-ink-hover px-1.5 py-0.5 rounded">
          {importPath}
        </code>
        <Usage on={on} />
      </div>
      <div className="text-[13px] leading-[1.5] text-faded-ink mt-2 max-w-[80ch]">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------- page */

const NAV = [
  ["current", "Current"],
  ["foundations", "· Foundations"],
  ["primitives", "· Primitives"],
  ["controls", "· Controls"],
  ["composites", "· Composites"],
  ["chrome", "· Layout & chrome"],
  ["legacy", "Legacy"],
];

export default function UIKitPage() {
  const [sports, setSports] = useState(["wingfoil"]);
  const [pill, setPill] = useState("best");
  const [inputValue, setInputValue] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [dot, setDot] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dayOpen, setDayOpen] = useState(true);

  const toggleSport = (id) =>
    setSports((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    // Same container as every page in the app: max-w-[1200px] with px-8, which
    // is what MainLayout and TopNav use. A kit rendered at a width no screen
    // uses hides exactly the wrapping problems it exists to catch.
    <div className="max-w-[1200px] mx-auto px-[18px] md:px-8 py-12 bg-page min-h-screen">
      <header className="mb-10">
        <h1 className="font-headline text-4xl font-extrabold text-ink mb-2 tracking-display-tight">
          UI Kit
        </h1>
        <p className="text-[14px] leading-[1.55] text-faded-ink max-w-[70ch] mb-5">
          Everything the app is built from, split by whether it is part of the current
          system or survives only on the older screens. New work composes from{" "}
          <strong className="text-ink">Current</strong> — if something needed is not here,
          it belongs here before it belongs in a page.
        </p>
        <ThemeSwitch />

        <nav className="flex flex-wrap gap-2 mt-6">
          {NAV.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="font-data text-[10px] tracking-label uppercase px-2.5 py-1.5 rounded-pill border border-card text-faded-ink hover:bg-ink-hover transition-colors duration-fast ease-smooth focus-ring"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      {/* ============================================================ CURRENT */}
      <Part
        id="current"
        title="Current"
        blurb="Used by Now, Next, Cams, the window detail and More. These carry the
        Nightglass/Dayglass tokens, respond to the theme switch above, and are the
        vocabulary for anything new. Route chips under each entry say where it is
        load-bearing today."
      >
        {/* ---------------------------------------------------- foundations */}
        <KitSection
          id="foundations"
          title="Foundations"
          blurb="Type, colour and motion. Every colour resolves through a CSS custom
          property, so this whole page repaints when the theme flips — the accent moves a
          long way between themes (#6EE7F0 → #0E7A85) because cyan on white is about 1.3:1."
        >
          <Row label="Display face — Bricolage Grotesque" importPath="font-headline">
            <div className="w-full">
              <div className="font-headline font-extrabold text-[46px] leading-[0.86] tracking-display-tighter text-ink">
                GO
              </div>
              <div className="font-headline font-extrabold text-[25px] tracking-display-tight text-ink mt-3">
                Next windows
              </div>
              <div className="font-headline font-bold text-[15px] tracking-display text-ink mt-2">
                Praia do Guincho
              </div>
            </div>
          </Row>

          <Row label="UI face — Space Grotesk" importPath="font-body (default)">
            <div className="w-full max-w-[70ch]">
              <Text>Standard body text. Prose, explanations, empty states.</Text>
              <Text variant="muted" className="mt-1">
                Muted secondary text for descriptions.
              </Text>
              <Text variant="caption" className="mt-1">
                Caption text for metadata and timestamps.
              </Text>
            </div>
          </Row>

          <Row label="Data face — JetBrains Mono, every number" importPath="font-data">
            <span className="font-data text-ink text-[15px] tabular-nums">
              14 kn (19*) SSW &nbsp;|&nbsp; 1.6 m 8 s &nbsp;|&nbsp; 06:00–22:00
            </span>
          </Row>

          <Row label="Mono labels — the contrast-critical treatment" full>
            <div className="flex flex-col gap-2">
              <span className="font-data text-[9px] tracking-label-wide text-dim uppercase">
                9px / .22em / dim — WHY WE THINK SO
              </span>
              <span className="font-data text-[10px] tracking-label text-accent uppercase">
                10px / .16em / accent — IN THE WATER
              </span>
              <span className="font-data text-[11px] tracking-label text-faded-ink uppercase">
                11px / .16em / muted — SPOT META, AXIS LABELS
              </span>
            </div>
          </Row>

          <Divider weight="light" className="my-7" />

          <Row label="Surfaces" importPath="app/theme.css" full>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Swatch className="bg-page border border-card" name="page" />
              <Swatch className="bg-surface border border-card" name="surface" />
              <Swatch className="bg-ink-hover border border-card" name="ink-hover" />
              <Swatch className="bg-offline-bg border border-card" name="offline-bg" />
            </div>
          </Row>

          <Row label="Text" full>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Swatch className="bg-ink" name="ink" />
              <Swatch className="bg-faded-ink" name="faded-ink" />
              <Swatch className="bg-dim" name="dim" />
              <div>
                <div className="h-14 rounded-card border border-card flex flex-col justify-center px-3 gap-0.5 mb-2">
                  <span className="text-ink text-xs">primary</span>
                  <span className="text-faded-ink text-xs">muted</span>
                  <span className="text-dim text-xs">dim</span>
                </div>
                <span className="font-data text-[10px] text-dim">in context</span>
              </div>
            </div>
          </Row>

          <Row
            label="Accent, score and state"
            note="caution is the MAYBE hue — declared as a channel triple so /10 and /30 work"
            full
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Swatch className="bg-accent" name="accent" />
              <Swatch className="bg-accent-mid" name="accent-mid" />
              <Swatch className="bg-accent-low" name="accent-low" />
              <Swatch className="bg-accent-faint" name="accent-faint" />
              <Swatch
                className="bg-accent-tint border border-accent-border"
                name="accent-tint (nav)"
              />
              <Swatch
                className="bg-accent-tint-card border border-accent-border"
                name="accent-tint-card"
              />
              <Swatch className="bg-track" name="track" />
              <Swatch className="bg-marginal" name="marginal" />
              <Swatch className="bg-caution" name="caution (MAYBE)" />
              <Swatch className="bg-caution/10 border border-caution/30" name="caution/10 + /30" />
              <Swatch className="bg-now text-now-text" name="now (chart marker)" />
              <Swatch className="bg-sport-pill" name="sport-pill" />
            </div>
          </Row>

          <Row label="Border radius" importPath="tailwind.config.js" full>
            <div className="flex items-center gap-6 flex-wrap">
              {[
                ["rounded-ui", "8"],
                ["rounded-card-sm", "14"],
                ["rounded-card", "16"],
                ["rounded-card-lg", "18"],
                ["rounded-card-xl", "20"],
                ["rounded-pill", "999"],
              ].map(([cls, px]) => (
                <div key={cls} className="text-center">
                  <div className={`w-14 h-14 border border-card bg-surface ${cls} mb-2`} />
                  <span className="font-data text-[10px] text-dim">{px}</span>
                </div>
              ))}
            </div>
          </Row>

          <Row label="Elevation and motion" full>
            <div className="flex flex-wrap items-center gap-6">
              <div className="text-center">
                <div className="w-20 h-14 bg-surface rounded-card border border-card mb-2" />
                <span className="font-data text-[10px] text-dim">cards: border + fill</span>
              </div>
              <div className="text-center">
                <div className="w-20 h-14 bg-nav-bg rounded-pill border border-nav-border shadow-nav mb-2" />
                <span className="font-data text-[10px] text-dim">nav: shadow in day only</span>
              </div>
              <div className="font-data text-[10px] text-dim leading-[1.8]">
                duration-fast 120ms · duration-base 200ms · duration-slow 300ms
                <br />
                ease-smooth cubic-bezier(0.25, 0.1, 0.25, 1)
              </div>
            </div>
          </Row>
        </KitSection>

        {/* ----------------------------------------------------- primitives */}
        <KitSection
          id="primitives"
          title="Primitives"
          blurb="The single source for every pill, number and arrow in the app. If a screen
          needs a small mono label, it is a Badge — not a span with the same classes."
        >
          <Row
            label="Badge — every pill in the app"
            importPath="components/ui/Badge"
            on={["NOW", "NEXT", "CAMS"]}
          >
            <Badge>default</Badge>
            <Badge variant="accent">accent</Badge>
            <Badge variant="epic">epic</Badge>
            <Badge variant="marginal">marginal</Badge>
            <Badge variant="live">
              <span className="w-1.5 h-1.5 rounded-full bg-page" />
              live
            </Badge>
            <span className="bg-offline-bg rounded-card-sm p-2 flex items-center gap-2">
              <Badge variant="overlay">overlay</Badge>
              <Badge variant="accent-solid">accent-solid</Badge>
            </span>
          </Row>
          <Row label="…the last two are for sitting on video" full>
            <p className="text-[13px] text-faded-ink max-w-[70ch]">
              <code className="font-data text-[11px] text-ink">overlay</code> is white on a
              dark scrim because the backdrop is footage, where theme text tokens are wrong by
              definition. <code className="font-data text-[11px] text-ink">accent-solid</code>{" "}
              is opaque page fill so it survives a bright sky — the translucent{" "}
              <code className="font-data text-[11px] text-ink">accent</code> disappears there.
            </p>
          </Row>

          <Row
            label="ScoreDial — sizes, in px. A stroked SVG arc, so it needs no opaque disc and works on any ground"
            importPath="components/ui/ScoreDial"
            on={["NOW", "NEXT", "LIVE", "SPOT"]}
          >
            {[40, 46, 52, 62, 70, 84].map((size) => (
              <div key={size} className="text-center">
                <ScoreDial score={92} size={size} showAll className="mx-auto mb-2" />
                <span className="font-data text-[10px] text-dim">{size}</span>
              </div>
            ))}
          </Row>
          <Row
            label="ScoreDial — bands"
            note="accent at 60+, marginal below; under 60 is hidden unless showAll"
          >
            {[92, 75, 60, 52, 41, 19].map((s) => (
              <div key={s} className="text-center">
                <ScoreDial score={s} size={52} showAll className="mx-auto mb-2" />
                <span className="font-data text-[10px] text-dim">{s}</span>
              </div>
            ))}
            <div className="text-center">
              <ScoreDialEmpty size={52} className="mx-auto mb-2" />
              <span className="font-data text-[10px] text-dim">no score</span>
            </div>
          </Row>
          <Row label="ScoreDial on a tinted card — no inner disc to match" full>
            <div className="bg-accent-tint-card border border-accent-border rounded-card-lg p-4 flex items-center gap-4 max-w-[420px]">
              <ScoreDial score={84} size={52} showAll />
              <div>
                <div className="font-headline font-bold text-[15px] text-ink tracking-display">
                  Praia do Guincho
                </div>
                <div className="font-data text-[11px] text-faded-ink mt-0.5">
                  Today 12:00–18:00
                </div>
              </div>
            </div>
          </Row>

          <Row
            label="MicroLabel — every all-caps mono label, one treatment"
            importPath="components/ui/MicroLabel"
            on={["NOW", "NEXT", "LIVE", "SPOT"]}
          >
            <MicroLabel>Wind</MicroLabel>
            <MicroLabel size="md">Waves &amp; tide</MicroLabel>
            <MicroLabel size="lg">The week</MicroLabel>
          </Row>

          <Row
            label="DayTag — TODAY leads in accent, other days are muted, and overlay survives a cam still"
            importPath="components/ui/DayTag"
            on={["NEXT"]}
          >
            <DayTag variant="today">TODAY</DayTag>
            <DayTag>SATURDAY</DayTag>
            <span className="bg-ink/40 rounded p-2">
              <DayTag variant="overlay" size="md">
                SUNDAY
              </DayTag>
            </span>
          </Row>

          <Row
            label="WindLine — the reading, per sport. Never wraps between a number and its unit"
            importPath="components/ui/WindLine"
            on={["NOW", "NEXT", "LIVE", "SPOT"]}
            full
          >
            <div className="flex flex-col gap-1.5">
              <WindLine slot={slot(0, 12, 88)} sport="wingfoil" className="text-ink" />
              <WindLine slot={slot(0, 12, 88)} sport="surfing" className="text-ink" />
              <WindLine
                slot={slot(0, 12, 88)}
                sport="wingfoil"
                suffix="nothing today"
                className="text-faded-ink"
              />
              <WindLine slot={null} sport="wingfoil" className="text-faded-ink" />
            </div>
          </Row>

          <Row
            label="SwipeDots — the active spot is a bar, the rest are dots"
            importPath="components/ui/SwipeDots"
            on={["NOW"]}
          >
            <SwipeDots count={4} index={dot} onSelect={setDot} />
          </Row>

          <Row
            label="DayTrack — a day on the 07–22 clock. Thin on a forecast row, tall in the week strip"
            importPath="components/ui/DayTrack"
            on={["NEXT", "SPOT"]}
            full
          >
            <div className="flex flex-col gap-3 max-w-[520px]">
              <DayTrack
                windows={SPOT_DAY.windows}
                dayStart={T0}
                firstHour={CHART.firstHour}
                lastHour={CHART.lastHour}
                nowMs={CHART_NOW}
              />
              <DayTrack
                windows={SPOT_DAY.windows}
                dayStart={T0}
                firstHour={CHART.firstHour}
                lastHour={CHART.lastHour}
                nowMs={CHART_NOW}
                height={5}
                radius={3}
              />
              <DayTrack
                windows={[]}
                dayStart={T0}
                firstHour={CHART.firstHour}
                lastHour={CHART.lastHour}
                nowMs={CHART_NOW}
                showNow={false}
              />
            </div>
          </Row>

          <Row
            label="SportBadge — the app's own marks"
            importPath="components/ui/SportBadge"
            on={["NOW", "NEXT", "CAMS", "WINDOW"]}
          >
            {["wingfoil", "kitesurfing", "surfing"].map((s) => (
              <span key={s} className="flex items-center gap-2">
                <SportBadge sport={s} size={20} className="text-accent" />
                <span className="font-data text-[10px] text-dim">{s}</span>
              </span>
            ))}
          </Row>

          <Row
            label="Arrow — rotates by the RAW stored bearing; the +180 lives in the label"
            importPath="components/ui/Arrow"
            on={["NOW", "NEXT", "CAMS"]}
          >
            {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
              <span key={d} className="flex flex-col items-center gap-1 text-ink">
                <Arrow direction={d} />
                <span className="font-data text-[9px] text-dim">{d}°</span>
              </span>
            ))}
          </Row>

          <Row
            label="LiveWindIndicator — the station reading, or nothing"
            importPath="components/wind/LiveWindIndicator"
            on={["NOW", "NEXT", "CAMS"]}
            note="renders null when missing or over an hour old"
          >
            <LiveWindIndicator
              stationId={null}
              label="LIVE"
              fallback={<Badge>no reading → renders null unless a fallback is given</Badge>}
            />
          </Row>

          <Row
            label="Button — variants"
            importPath="components/ui/Button"
            on={["NOW", "NEXT", "CAMS", "WINDOW", "MORE"]}
          >
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="icon" aria-label="Settings">
              <Settings size={16} />
            </Button>
          </Row>
          <Row label="Button — sizes, icons, states">
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button variant="primary" size="lg">
              Large
            </Button>
            <Button variant="secondary" icon={Plus}>
              Add
            </Button>
            <Button variant="ghost" icon={ArrowRight} size="sm">
              See all
            </Button>
            <Button variant="danger" icon={Trash2}>
              Delete
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
            <Button variant="primary" loading>
              Saving…
            </Button>
          </Row>

          <Row
            label="Heading / Text / Divider"
            importPath="components/ui/{Heading,Text,Divider}"
            on={["SETTINGS", "MORE"]}
            note="new screens mostly set type directly; these carry the older pages"
            full
          >
            <div className="max-w-[60ch]">
              <Heading level={2}>Section title</Heading>
              <Text variant="muted" className="mt-1">
                Body copy underneath.
              </Text>
              <Divider weight="light" className="my-3" />
              <Divider weight="medium" className="my-3" />
              <Divider weight="heavy" className="my-3" />
            </div>
          </Row>

          <Row
            label="Metric / DataGroup / ConditionLine — the readout row"
            importPath="components/ui/{Metric,DataGroup,ConditionLine}"
            on={["NOW", "CAMS"]}
            note="reached through the cam surfaces"
            full
          >
            <div className="flex flex-col gap-3">
              {/* `icon` takes an ELEMENT, not a component — passing `Wind`
                  itself renders an object and blows up the tree. */}
              <Metric icon={<Wind size={14} className="mr-1.5 text-faded-ink" />}>18 kn</Metric>
              <DataGroup icon={<Wind size={14} className="mr-1.5 text-faded-ink" />} direction={160}>
                18 kn (24*)
              </DataGroup>
              <ConditionLine
                speed={14}
                gust={19}
                direction={210}
                waveHeight={1.6}
                wavePeriod={8}
                sport="wingfoil"
              />
              <ConditionLine
                speed={5}
                gust={8}
                direction={180}
                waveHeight={1.8}
                wavePeriod={12}
                sport="surfing"
              />
            </div>
          </Row>

          <Row
            label="WindGroup / WaveGroup / DirectionIndicator"
            importPath="components/forecast/*"
            on={["NOW", "CAMS"]}
            full
          >
            <div className="flex flex-wrap items-center gap-8">
              <WindGroup speed={14} gust={19} direction={210} />
              <WaveGroup waveHeight={1.6} wavePeriod={8} waveDirection={300} />
              <DirectionIndicator direction={45} />
              <DirectionIndicator direction={225} />
            </div>
          </Row>

          <Row
            label="Loader"
            importPath="components/common/Loader"
            on={["CAMS"]}
            note="min-h-[50vh] — it is a whole-screen state, not an inline spinner"
          >
            {/* Boxed, because the component claims half the viewport by design
                and would otherwise leave a screen of empty page in the kit. */}
            <div className="h-[120px] w-[220px] overflow-hidden rounded-card-sm border border-dashed border-card flex items-center">
              <Loader />
            </div>
          </Row>
          <Row label="EmptyState" importPath="components/common/EmptyState" on={["CAMS"]} full>
            <div className="max-w-md">
              <EmptyState />
            </div>
          </Row>
        </KitSection>

        {/* ------------------------------------------------------- controls */}
        <KitSection
          id="controls"
          title="Controls"
          blurb="Sport and spot are the two axes every screen is filtered on, so both have
          exactly one control each. Anything that looks like a filter but is not one of these
          is a bug."
        >
          <Row
            label="SportFilterChip — the sport control on Now, Next and inside the verdict card"
            importPath="components/sport/SportFilterChip"
            on={["NOW", "NEXT", "CAMS"]}
            note="reads and writes SportProvider; no props"
          >
            <SportFilterChip />
          </Row>

          <Row
            label="SportSegmented — the same choice at desktop width, filling one 34px pill"
            importPath="components/sport/SportSegmented"
            on={["NOW", "NEXT", "LIVE", "SPOT"]}
          >
            <SportSegmented />
          </Row>

          <Row
            label="SpotTitle + SpotPickerSheet — the screen title IS the picker"
            importPath="components/spot/SpotPickerSheet"
            on={["NOW", "NEXT", "LIVE", "SPOT"]}
            note="carries each spot's score and live wind, so the choice is not made blind"
            full
          >
            <div className="relative max-w-[420px]">
              <SpotTitle open={sheetOpen} onClick={() => setSheetOpen((v) => !v)}>
                Lagoa da Albufeira
              </SpotTitle>
              <SpotPickerSheet
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                spots={[PACK, { ...PACK, spot: SPOTS[1], score: 88 }, PACK_NO_STATION]}
                value={PACK.spot._id}
                onChange={() => {}}
                sport="wingfoil"
              />
            </div>
          </Row>

          <Row
            label="SportFilter — multi-select, used on Cams"
            importPath="components/ui/SportFilter"
            on={["CAMS"]}
          >
            <SportFilter selectedSports={sports} onToggle={toggleSport} />
          </Row>

          <Row label="FilterGroup — labelled control wrapper" importPath="components/ui/FilterGroup">
            <FilterGroup label="Show">
              <SportFilter selectedSports={sports} onToggle={toggleSport} />
            </FilterGroup>
          </Row>

          <Row
            label="ShareButton"
            importPath="components/ui/ShareButton"
            on={["NOW", "NEXT", "CAMS", "WINDOW"]}
          >
            <ShareButton url="https://watermanreport.com" title="Waterman" />
          </Row>
        </KitSection>

        {/* ----------------------------------------------------- composites */}
        <KitSection
          id="composites"
          title="Composites"
          blurb="Whole answers rather than parts. These own their own layout and are the
          reason the screens are thin — Now is a cam, a verdict and a DayChartPanel; Next is
          three WindowCards and a WeekStrip; Live is a grid of LiveCards."
        >
          <Row
            label="SpotRow — the one list row: score, name, reading"
            importPath="components/spot/SpotRow"
            on={["NOW", "LIVE", "SPOT"]}
            note='dialSide="trailing" on a card, where the picture leads'
            full
          >
            <div className="max-w-[420px] rounded-card-lg border border-card bg-surface divide-y divide-[color:var(--wm-border)]">
              <SpotRow {...PACK} sport="wingfoil" size="sm" />
              <SpotRow
                {...PACK_NO_STATION}
                sport="wingfoil"
                size="sm"
                dim
                suffix="nothing today"
              />
            </div>
          </Row>

          <Row
            label="WindBand — forecast as columns, the station as lines, clipped to now"
            importPath="components/chart/WindBand"
            on={["NOW", "LIVE", "SPOT"]}
            note="past slots dim rather than vanish — the miss is the point"
            full
          >
            <div className="max-w-[520px]">
              <BandHeader label="Wind" legend={WIND_LIVE_LEGEND} className="pb-[7px]" />
              <WindBand chart={CHART} station={STATION_TRAIL} height={88} />
              <TimeAxis chart={CHART} className="mt-2 pt-2 border-t border-rule" />
            </div>
          </Row>

          <Row
            label="WaveTideBand — a muted solid for swell, a dashed accent for tide"
            importPath="components/chart/WaveTideBand"
            on={["NOW", "SPOT"]}
            note="renders nothing at all when the spot has neither"
            full
          >
            <div className="max-w-[520px]">
              <BandHeader
                label={waveTideLabel(waveTidePresence(CHART, TIDES))}
                legend={waveTideLegend(waveTidePresence(CHART, TIDES))}
                className="pb-[7px]"
              />
              <WaveTideBand chart={CHART} tides={TIDES} height={56} nowMs={CHART_NOW} />
            </div>
          </Row>

          <Row
            label="ScoreBand — the number is printed, not hidden behind a hover"
            importPath="components/chart/ScoreBand"
            on={["NOW", "SPOT"]}
            full
          >
            <div className="max-w-[520px]">
              <BandHeader label="Score" className="pb-[7px]" />
              <ScoreBand chart={CHART} height={50} />
            </div>
          </Row>

          <Row
            label="DayChartPanel — the three bands, one axis, one now line"
            importPath="components/chart/DayChartPanel"
            on={["NOW", "SPOT"]}
            note="no card chrome: it is one chart of a day, not three charts near each other"
            full
          >
            <div className="max-w-[520px]">
              <DayChartPanel
                chart={CHART}
                sport="wingfoil"
                station={STATION_TRAIL}
                tides={TIDES}
                nowMs={CHART_NOW}
              />
            </div>
          </Row>

          <Row
            label="DayChartPanel — forecast only (Spot forecast): no station, no wash, no now rule"
            full
          >
            <div className="max-w-[520px]">
              <DayChartPanel
                chart={CHART}
                sport="wingfoil"
                station={null}
                tides={TIDES}
                nowMs={CHART_NOW}
                showWash={false}
                showNow={false}
                bandHeights={{ wind: 66, waves: 46, score: 44 }}
              />
            </div>
          </Row>

          <Row
            label="WindowCard — rows on a phone, cards with a still at width"
            importPath="components/next/WindowCard"
            on={["NEXT"]}
            full
          >
            <div className="flex flex-col gap-[9px] max-w-[420px]">
              {WINDOWS.map(({ spot, window }, i) => (
                <WindowCard
                  key={spot._id}
                  spot={spot}
                  window={window}
                  sport="wingfoil"
                  dayLabel={["TODAY", "SATURDAY", "SUNDAY"][i]}
                  isToday={i === 0}
                  highlight={i === 0}
                />
              ))}
            </div>
          </Row>

          <Row
            label="SpotDayRow — collapsed to a line, expanded to the chart"
            importPath="components/spot/SpotDayRow"
            on={["SPOT"]}
            full
          >
            <div className="flex flex-col gap-[5px] max-w-[520px]">
              <SpotDayRow
                day={SPOT_DAY}
                sport="wingfoil"
                chart={CHART}
                tides={TIDES}
                nowMs={CHART_NOW}
                open={dayOpen}
                onToggle={() => setDayOpen((v) => !v)}
                onLive={() => {}}
              />
              <SpotDayRow
                day={{ ...SPOT_DAY, label: "Saturday", windows: [], peak: 41 }}
                sport="wingfoil"
                chart={CHART}
                tides={TIDES}
                nowMs={CHART_NOW}
                open={false}
                onToggle={() => {}}
              />
            </div>
          </Row>

          <Row
            label="LiveCard — identity above the cam so a half-scrolled card is still named"
            importPath="components/live/LiveCard"
            on={["LIVE"]}
            full
          >
            <div className="flex flex-col gap-[7px] max-w-[420px]">
              <LiveCard
                pack={PACK}
                sport="wingfoil"
                chart={CHART}
                highlight
                onOpenCam={() => {}}
              />
              <LiveCard pack={PACK_NO_STATION} sport="wingfoil" chart={CHART} />
            </div>
          </Row>

          <Row
            label="WeekStrip — six days on one clock, the selected day open"
            importPath="components/next/WeekStrip"
            on={["NEXT"]}
            full
          >
            <WeekStrip
              days={WEEK_DAYS}
              selectedDay={WEEK_DAYS[0].dayStart}
              onSelectDay={() => {}}
              chart={WEEK_CHART}
              nowMs={CHART_NOW}
            />
          </Row>

          <Row
            label="LabsSection — collapsed by default, details/summary so it works pre-hydration"
            importPath="components/ui/LabsSection"
            on={["NOW", "WINDOW"]}
            full
          >
            <LabsSection title="IN THE WATER" caption="Estimated from webcam footage">
              <InTheWaterCard reading={RIDER_COUNT} sportNoun="wingers" bare />
            </LabsSection>
          </Row>

          <Row
            label="InTheWaterCard — bare drops the card chrome when already inside one"
            importPath="components/now/EvidenceStack"
            on={["NOW"]}
            full
          >
            <div className="max-w-md">
              <InTheWaterCard reading={RIDER_COUNT} sportNoun="wingers" />
            </div>
          </Row>

          <Row
            label="EvidenceStack — station, model agreement, and a forecast backstop"
            importPath="components/now/EvidenceStack"
            on={["NOW"]}
            note="the stack must read as complete with only the cards it can fill"
            full
          >
            <div className="max-w-md">
              {/* The station card has no export of its own — it is chosen inside
                  the stack by whether there is a reading. Rendering the stack
                  with only a station shows it without exporting an internal
                  purely for the kit's benefit. */}
              <EvidenceStack
                station={STATION}
                reasoning="Steady 18–21 kn NNW through the afternoon."
              />
            </div>
          </Row>

          <Row
            label="ScreenError / ScreenEmpty — the two states that are not the same state"
            importPath="components/common/ScreenState"
            on={["NOW", "NEXT", "LIVE", "SPOT"]}
            note="a broken fetch must never look like a flat coast"
            full
          >
            <div className="max-w-md flex flex-col gap-4">
              <ScreenError onRetry={() => {}} />
              <ScreenEmpty
                title="Nothing here for this sport"
                body="None of your spots do this sport. Pick another sport, or add a spot that does."
                actionLabel="CHOOSE YOUR SPOTS"
                onAction={() => {}}
              />
            </div>
          </Row>

          <Row
            label="LiveLegend — once in the page header, never per card"
            importPath="components/live/LiveCard"
            on={["LIVE"]}
          >
            <LiveLegend />
          </Row>

          <Row
            label="ScoreFactors — what the scorer weighed"
            importPath="components/confidence/ScoreFactors"
            on={["WINDOW"]}
            full
          >
            <ScoreFactors
              factors={FACTORS}
              reasoning="Steady 18–21 kn NNW through the afternoon with a short chop; the tide turns at 16:20 and softens the inside."
            />
          </Row>

          <Row
            label="HourByHour — the window's shape as actual numbers"
            importPath="components/confidence/HourByHour"
            on={["WINDOW"]}
            full
          >
            <HourByHour slots={HOUR_SLOTS} sport="wingfoil" />
          </Row>

          <Row
            label="ModelGrid — when each model says go"
            importPath="components/confidence/ModelGrid"
            on={["WINDOW"]}
            note="wind sports only; wave data is identical across the five wind models"
            full
          >
            <ModelGrid
              columns={MODEL_COLUMNS}
              sourceModel="gfs27_long"
              agreedByColumn={[4, 4, 3]}
              outlier="iconeuro"
              sentence="Four of five models back this window; ICON-EU is alone in calling it light."
              // The keys MUST come from lib/agreement WIND_MODELS — modelLabel()
              // falls back to raw uppercase for anything it does not know, so an
              // invented key like "icon_eu" renders as ICON_EU, underscore and
              // all, and the kit ends up teaching a model list that does not
              // exist. "arome" is worse than wrong: the scraper distrusts it by
              // name because it echoes its own id and returns GFS data.
              models={[
                { model: "gfs27_long", votes: [true, true, true] },
                { model: "ecmwf", votes: [true, true, "near"] },
                { model: "iconeuro", votes: [false, false, false] },
                { model: "iconglobal", votes: ["near", true, true] },
                { model: "lew", votes: [true, true, true] },
              ]}
            />
          </Row>
        </KitSection>

        {/* ---------------------------------------------------------- chrome */}
        <KitSection
          id="chrome"
          title="Layout & chrome"
          blurb="Not rendered here — a second nav inside the kit would be more confusing than
          useful. These are the rules they enforce."
        >
          <Documented
            name="MainLayout"
            importPath="components/layout/MainLayout"
            on={["ALL"]}
          >
            One width for every page: <code className="font-data text-[11px] text-ink">
            max-w-[1440px]</code> with <code className="font-data text-[11px] text-ink">px-5
            md:px-10</code>, which is exactly what TopNav uses. It also owns the 96px tail every
            scroll container has to reserve for the floating bottom nav — forgetting that is
            invisible until someone scrolls to the end. There is no{" "}
            <code className="font-data text-[11px] text-ink">wide</code> prop — a body narrower
            than the bar above it reads as a misalignment, not as a deliberate measure.
          </Documented>

          <Documented
            name="ScreenHeader"
            importPath="components/layout/ScreenHeader"
            on={["NOW", "NEXT", "LIVE", "SPOT"]}
          >
            The top line of all four screens: title left, sport right, in the same place every
            time. The title IS the spot picker where there is one — the chevron beside it is the
            affordance — because on Now, Live and Spot forecast the title already names the
            current spot, and a separate control for changing it would sit next to a heading
            saying the same thing. Anchors the picker sheet, so the sheet stays attached to its
            title rather than to the viewport.
          </Documented>

          <Documented name="TopNav" importPath="components/layout/TopNav" on={["ALL", "md+"]}>
            Sticky, blurred, <code className="font-data text-[11px] text-ink">hidden md:block</code>.
            Wordmark, the four primary tabs, a <code className="font-data text-[11px] text-ink">
            tools</code> slot (TV mode on Live), the sport segmented control and the account
            chip. Every control in it is a 34px pill with matching radius; mixed heights made
            the sport selector read as a fifth tab.
          </Documented>

          <Documented name="BottomNav" importPath="components/layout/BottomNav" on={["ALL", "mobile"]}>
            The mobile counterpart: a 56px floating pill, inset 14px, Now · Next · Live · More,
            from the same <code className="font-data text-[11px] text-ink">navTabs</code> source
            as TopNav so the two can never disagree about what the primary destinations are.
          </Documented>

          <Documented
            name="CamFrame / CamThumb / CamOffline"
            importPath="components/ui/CamFrame"
            on={["NOW", "NEXT", "LIVE"]}
          >
            The cam, in a box: 16:9, no overlay chrome except the fullscreen affordance.
            Documented rather than rendered because it opens a live HLS stream. The offline
            plate is the part worth knowing: it distinguishes a cam that broke this morning
            (&ldquo;CAM OFFLINE SINCE 08:20&rdquo;) from a spot that never had one (&ldquo;No cam
            at this spot&rdquo;) — Praia do CDS and Fonte da Telha are the second case, and a
            black rectangle would have said neither.
          </Documented>

          <Documented
            name="WebcamCard / WebcamFullscreen / TvMode / LiveCam"
            importPath="components/webcam/*, components/now/LiveCam"
            on={["NOW", "LIVE"]}
          >
            Live HLS video, so they are documented rather than rendered — a kit page that
            opens a dozen streams is a kit page nobody loads. WebcamCard fills its grid cell
            (<code className="font-data text-[11px] text-ink">h-full</code> + column, meta block
            absorbing the slack) so cams with less data below the image do not come up short.
            Its <code className="font-data text-[11px] text-ink">overlayBadge</code> slot is how
            the rider count and the live wind pill share one row instead of stacking on each
            other. LiveCam is the compact player for the verdict card; WebcamFullscreen is the
            modal both Now and Cams open.
          </Documented>

          <Documented
            name="RecordButton"
            importPath="components/webcam/RecordButton"
            on={["NOW", "CAMS"]}
          >
            Clip capture on a cam surface. Hidden on mobile, appears on hover at md+ —
            one tap on a phone means fullscreen, so a hover-revealed control there would be
            unreachable. Rendered inside WebcamCard and WebcamFullscreen rather than placed
            by a screen.
          </Documented>

          <Documented
            name="StationWindChart / WaveTideChart / WindReading / LiveEvidencePanel"
            importPath="components/now/*, components/confidence/LiveEvidencePanel"
            on={["WINDOW"]}
          >
            The Recharts-based hero charts and the big wind readout, now used only by the
            window confidence screen. The four redesigned screens draw their charts from{" "}
            <code className="font-data text-[11px] text-ink">components/chart/*</code> instead:
            those are laid out in percentages on the shared{" "}
            <code className="font-data text-[11px] text-ink">dayChart</code> geometry, which is
            what lets three bands share one axis and one now rule. Do not reach for these in new
            work.
          </Documented>

          <Documented
            name="useCoastData"
            importPath="components/data/useCoastData"
            on={["NOW", "NEXT", "LIVE", "SPOT"]}
          >
            Not a component — the one hook all four screens read. Takes a sport and returns a
            pack per spot: the current slot and its score, the live station (or null when the
            sensor is dead, with{" "}
            <code className="font-data text-[11px] text-ink">hasStationUrl</code> to tell
            &ldquo;broken&rdquo; from &ldquo;never had one&rdquo;), tides, and six days of
            slots, windows and peaks. Four fetch paths guaranteed the screens would disagree
            about the same beach; one guarantees they cannot. In development only, an{" "}
            <code className="font-data text-[11px] text-ink">?at=</code> query parameter moves
            the clock so the interesting states are reviewable at any hour.
          </Documented>

          <Documented
            name="lib/dayChart"
            importPath="lib/dayChart"
            on={["NOW", "NEXT", "LIVE", "SPOT"]}
          >
            The shared geometry. One function,{" "}
            <code className="font-data text-[11px] text-ink">buildDayChart</code>, turns a
            spot&rsquo;s slots and a day into six columns, the axis marks, and where the now
            rule falls on the continuous time scale. Derived from the forecast&rsquo;s real
            timestamps rather than hardcoded, because the grid is UTC and lands an hour earlier
            in winter — a fixed 07/10/13 axis was wrong for half the year. Also owns the score
            bands and the wind/wave scales, so a dial, a bar and a ring can never disagree
            about what 74 means.
          </Documented>

          <Documented
            name="SportProvider / ThemeProvider / FlagProvider / AuthProvider"
            importPath="components/{sport,theme,flags,auth}/*"
            on={["ALL"]}
          >
            Context, not chrome. Sport and theme are persisted; theme resolves from local
            sunrise/sunset unless overridden. Flags gate unshipped work — rider counts run on
            fixtures and are never written to Convex, because production and development share
            one deployment.
          </Documented>
        </KitSection>
      </Part>

      {/* ============================================================= LEGACY */}
      <Part
        id="legacy"
        tone="legacy"
        title="Legacy"
        blurb="Only reachable from the older screens — /report, the spot pages, the sport
        filter routes, dashboard, calendar, journal and profile. They still work and still
        follow the theme, but they are not the vocabulary for new work: each entry below names
        what to reach for instead."
      >
        <KitSection
          title="Superseded by Current"
          blurb="Do not use these in new screens."
        >
          <Row
            label="Card — generic container"
            importPath="components/ui/Card"
            on={["RECORDINGS"]}
            note="→ use a bare div with rounded-card-lg bg-surface border-card"
            full
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <Heading level={4}>Default</Heading>
                <Text variant="muted" className="mt-1">
                  Static container.
                </Text>
              </Card>
              <Card variant="interactive" onClick={() => {}}>
                <Heading level={4}>Interactive</Heading>
                <Text variant="muted" className="mt-1">
                  Hover state.
                </Text>
              </Card>
              <Card variant="elevated">
                <Heading level={4}>Elevated</Heading>
                <Text variant="muted" className="mt-1">
                  Shadow.
                </Text>
              </Card>
            </div>
          </Row>

          <Row
            label="ScoreCard + ScoreDisplay"
            importPath="components/ui/{ScoreCard,ScoreDisplay}"
            on={["DASHBOARD"]}
            note="→ ScoreDial, plus WindowCard for a ranked list. ScoreDisplay has no callers left at all"
            full
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[65, 78, 95].map((s) => (
                <ScoreCard key={s} score={s} onClick={() => {}}>
                  <div className="flex justify-between items-center">
                    <div>
                      <Heading level={4}>Praia do Guincho</Heading>
                      <Text variant="caption">15:00</Text>
                    </div>
                    <ScoreDisplay score={s} size="lg" />
                  </div>
                </ScoreCard>
              ))}
            </div>
          </Row>

          <Row
            label="Section — titled block with an action"
            importPath="components/ui/Section"
            on={["DASHBOARD"]}
            note="→ a plain h2 in the screen; the new pages set their own headings"
            full
          >
            <div className="border border-dashed border-card rounded-card p-4">
              <Section
                title="Today's best conditions"
                action={
                  <Button variant="ghost" icon={ArrowRight} size="sm">
                    See all
                  </Button>
                }
              >
                <Text variant="muted">Section content…</Text>
              </Section>
            </div>
          </Row>

          <Row
            label="PillToggle — single-select sport/filter pills"
            importPath="components/ui/PillToggle"
            on={["REPORT", "SPOT", "JOURNAL"]}
            note="→ SportFilterChip for sport, SportFilter for multi-select"
          >
            <PillToggle
              options={[
                { id: "best", label: "Best" },
                { id: "all", label: "All" },
              ]}
              value={pill}
              onChange={setPill}
            />
          </Row>

          <Row
            label="Tooltip"
            importPath="components/ui/Tooltip"
            on={["REPORT", "SPOT"]}
            note="→ WeekStrip carries its own; a shared one has not been needed since"
          >
            <Tooltip content="60–74 Good · 75–89 Great · 90+ Epic">
              <span className="font-body text-sm text-faded-ink underline decoration-dotted cursor-help">
                Hover for the score scale
              </span>
            </Tooltip>
          </Row>

          <Row
            label="TideDisplay"
            importPath="components/tide/TideDisplay"
            on={["REPORT", "SPOT"]}
            note="→ HourByHour surfaces tide turns inside the slot they fall in"
          >
            {/* `time` is an epoch, not a string — a "14:30" here formats to
                NaN:NaN, which is exactly the kind of contract drift a kit is
                supposed to catch. `timeStr` is the string escape hatch. */}
            <TideDisplay tide={{ isExactTime: true, type: "high", timeStr: "14:30", height: 3.2 }} />
            <TideDisplay tide={{ isExactTime: true, type: "low", timeStr: "20:15", height: 0.8 }} />
            <TideDisplay tide={{ isRising: true }} />
            <TideDisplay tide={{ isFalling: true }} />
          </Row>
        </KitSection>

        <KitSection
          title="Still current in their own right"
          blurb="Legacy-only by usage, but nothing has replaced them — a new screen that needs
          a form or a modal should use these rather than inventing another."
        >
          <Row
            label="Input — text, icon, multiline, readOnly, disabled"
            importPath="components/ui/Input"
            on={["PROFILE"]}
            full
          >
            <div className="flex flex-wrap gap-3 max-w-2xl">
              <Input
                placeholder="Search spots…"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="max-w-xs"
              />
              <Input value="read-only@example.com" readOnly className="max-w-xs" />
              <Input placeholder="Disabled" disabled className="max-w-xs" />
              <Input multiline rows={3} placeholder="Session notes…" className="max-w-sm" />
            </div>
          </Row>

          <Row
            label="Modal — sm 420 · md 560 · lg 672"
            importPath="components/ui/Modal"
            on={["REPORT", "DASHBOARD"]}
          >
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Open modal
            </Button>
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="md">
              <div className="p-8">
                <Heading level={3}>Example modal</Heading>
                <Text variant="muted" className="mt-2">
                  Click-outside dismiss, close button, body scroll lock, three sizes.
                </Text>
                <div className="mt-6">
                  <Button variant="primary" onClick={() => setModalOpen(false)}>
                    Got it
                  </Button>
                </div>
              </div>
            </Modal>
          </Row>
        </KitSection>

        <KitSection
          title="Screen-specific, not shared"
          blurb="These exist to render one legacy screen and have no life outside it. Listed so
          the inventory is complete, not because anything should compose from them."
        >
          <div className="grid gap-2 md:grid-cols-2">
            {[
              ["ForecastSlot / DaySection / LiveWindRow", "components/forecast/*", "/report, spot pages"],
              ["FilterBar", "components/ui/FilterBar", "/report, calendar, journal"],
              ["CalendarView", "components/calendar/CalendarView", "/calendar"],
              ["SessionCard / RatingInput / DurationInput", "components/journal/*", "/journal"],
              ["OnboardingModal / OnboardingFlow", "components/{onboarding,auth}/*", "/dashboard, auth"],
              ["WebcamModal", "components/common/WebcamModal", "/report — superseded by WebcamFullscreen"],
              ["ScoreModal", "components/common/ScoreModal", "score explainer, still reached from Cams"],
              ["Toast / ToastProvider", "components/admin/*", "/admin"],
            ].map(([name, path, where]) => (
              <div key={name} className="rounded-card-sm border border-card bg-surface px-3.5 py-2.5">
                <div className="font-headline font-bold text-[13px] text-ink">{name}</div>
                <code className="font-data text-[10px] text-dim">{path}</code>
                <div className="font-data text-[9px] text-dim mt-1 uppercase tracking-label">
                  {where}
                </div>
              </div>
            ))}
          </div>
        </KitSection>

        <KitSection
          title="Unreferenced"
          blurb="Reachable from no route at all. Kept in the tree but safe to delete — listing
          them here is how the kit stays honest about what it is documenting."
        >
          <div className="flex flex-wrap gap-2">
            {[
              "layout/GlobalNavigation",
              "layout/MobileMenu",
              "layout/ShowFilter",
              "layout/SportSelector",
              "layout/ViewToggle",
              "sport/SportSegmented",
              "tide/TideChart",
              "tide/TideIndicator",
              "tide/TideSection",
              "tide/TideTable",
              "ui/Icon",
              "ui/Select",
              "ui/ScoreDisplay",
              "admin/SpotConfigForm",
            ].map((n) => (
              <code
                key={n}
                className="font-data text-[10px] text-dim border border-card rounded px-2 py-1"
              >
                {n}
              </code>
            ))}
          </div>
        </KitSection>
      </Part>

      <Divider weight="heavy" className="mt-12 mb-6" />
      <p className="font-data text-[10px] text-dim text-center pb-8 tracking-label">
        BRICOLAGE GROTESQUE FOR DISPLAY · SPACE GROTESK FOR UI · JETBRAINS MONO FOR EVERY NUMBER
      </p>
    </div>
  );
}
