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
import { ScoreDial } from "../../components/ui/ScoreDial";
import { SportBadge } from "../../components/ui/SportBadge";
import { SportFilter } from "../../components/ui/SportFilter";
import { FilterGroup } from "../../components/ui/FilterGroup";
import { ShareButton } from "../../components/ui/ShareButton";
import { LabsSection } from "../../components/ui/LabsSection";
import { SportFilterChip } from "../../components/sport/SportFilterChip";
import { SpotPicker, FAVORITES } from "../../components/next/SpotPicker";
import { WindowCard } from "../../components/next/WindowCard";
import { WeekStrip } from "../../components/next/WeekStrip";
import { VerdictCard } from "../../components/now/VerdictCard";
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
import { VERDICT } from "../../lib/verdict";
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
  HOUR_SLOTS,
  FACTORS,
  STATION,
  RIDER_COUNT,
  MODEL_COLUMNS,
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
  const [scope, setScope] = useState(FAVORITES);
  const [pill, setPill] = useState("best");
  const [inputValue, setInputValue] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

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
                11px / .16em / muted — HOLDING UNTIL ABOUT 15:00
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
            label="ScoreDial — sizes"
            importPath="components/ui/ScoreDial"
            on={["NOW", "NEXT", "CAMS", "WINDOW"]}
          >
            {["xs", "sm", "md", "lg", "xl"].map((size) => (
              <div key={size} className="text-center">
                <ScoreDial score={92} size={size} className="mx-auto mb-2" />
                <span className="font-data text-[10px] text-dim">{size}</span>
              </div>
            ))}
          </Row>
          <Row
            label="ScoreDial — bands"
            note="under 60 is hidden unless showAll; accent 60+, marginal 45–59, dim below"
          >
            {[92, 75, 60, 52, 41, 19].map((s) => (
              <div key={s} className="text-center">
                <ScoreDial score={s} size="md" showAll className="mx-auto mb-2" />
                <span className="font-data text-[10px] text-dim">{s}</span>
              </div>
            ))}
          </Row>
          <Row label='ScoreDial on a tinted card — on="card" matches the inner disc' full>
            <div className="bg-accent-tint-card border border-accent-border rounded-card-lg p-4 flex items-center gap-4 max-w-[420px]">
              <ScoreDial score={84} size="md" on="card" label="NOW" />
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
            label="SpotPicker — inline in a title, dotted underline + chevron"
            importPath="components/next/SpotPicker"
            on={["NEXT", "CAMS"]}
            full
          >
            <h4 className="font-headline font-extrabold text-[25px] tracking-display-tight text-ink">
              Next windows
              <span className="text-faded-ink font-normal mx-[0.28em]">at</span>
              <SpotPicker spots={SPOTS} value={scope} onChange={setScope} hasFavorites />
            </h4>
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
          reason the screens are thin — Now is a VerdictCard, three WindowCards and an
          evidence stack; Next is three WindowCards and a WeekStrip."
        >
          <Row
            label="VerdictCard — GO"
            importPath="components/now/VerdictCard"
            on={["NOW"]}
            full
          >
            <VerdictCard
              verdict={VERDICT.GO}
              sport="wingfoil"
              spotName="Praia do Guincho"
              score={92}
              metric={primaryMetric(slot(0, 15, 92), "wingfoil")}
              reason="HOLDING UNTIL ABOUT 18:00"
            />
          </Row>
          <Row label="VerdictCard — MAYBE" full>
            <VerdictCard
              verdict={VERDICT.MARGINAL}
              sport="wingfoil"
              spotName="Marina de Cascais"
              score={58}
              metric={primaryMetric(slot(0, 15, 58, { speed: 11, gust: 14 }), "wingfoil")}
              reason="LIGHT, BUT CLEAN"
            />
          </Row>
          <Row label="VerdictCard — NO GO, and the surf variant (swell leads, wind is context)" full>
            {/* min-w-0 on the tracks: grid items default to min-width:auto, so
                a single-column track at phone width is sized by the card's
                min-content and pushes the page sideways. */}
            <div className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
              <VerdictCard
                verdict={VERDICT.NO}
                sport="wingfoil"
                spotName="Lagoa da Albufeira"
                score={22}
                metric={primaryMetric(slot(0, 15, 22, { speed: 4, gust: 6 }), "wingfoil")}
                reason="NOTHING ON"
              />
              <VerdictCard
                verdict={VERDICT.GO}
                sport="surfing"
                spotName="Carcavelos"
                score={81}
                metric={primaryMetric(slot(0, 9, 81, { speed: 6, waveHeight: 1.4 }), "surfing")}
                reason="OFFSHORE ALL MORNING"
              />
            </div>
          </Row>

          <Row
            label="WindowCard — three across on desktop, rows on mobile"
            importPath="components/next/WindowCard"
            on={["NOW", "NEXT"]}
            note="showSpot={false} when the screen already names one spot"
            full
          >
            <div className="grid gap-2 md:grid-cols-3">
              {WINDOWS.map(({ spot, window }, i) => (
                <WindowCard
                  key={spot._id}
                  spot={spot}
                  window={window}
                  sport="wingfoil"
                  highlight={i === 0}
                />
              ))}
            </div>
          </Row>
          <Row label="WindowCard — scoped to one spot" full>
            <div className="grid gap-2 md:grid-cols-3">
              {WINDOWS.map(({ spot, window }, i) => (
                <WindowCard
                  key={spot._id}
                  spot={spot}
                  window={window}
                  sport="wingfoil"
                  showSpot={false}
                  highlight={i === 0}
                />
              ))}
            </div>
          </Row>

          <Row
            label="WeekStrip — six days, shaded good → great → epic across slots"
            importPath="components/next/WeekStrip"
            on={["NEXT"]}
            note="hover a band for wind, gust and direction"
            full
          >
            <WeekStrip days={WEEK} sport="wingfoil" title="The week" />
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
              outlier="icon_eu"
              sentence="Four of five models back this window; ICON-EU is alone in calling it light."
              models={[
                { model: "gfs27_long", votes: [true, true, true] },
                { model: "ecmwf", votes: [true, true, "near"] },
                { model: "icon_eu", votes: [false, false, false] },
                { model: "arome", votes: ["near", true, true] },
                { model: "nam", votes: [true, true, true] },
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
            max-w-[1200px]</code> with <code className="font-data text-[11px] text-ink">px-[18px]
            md:px-8</code>, which is exactly what TopNav uses. There is no{" "}
            <code className="font-data text-[11px] text-ink">wide</code> prop — a body narrower
            than the bar above it reads as a misalignment, not as a deliberate measure.
          </Documented>

          <Documented name="TopNav" importPath="components/layout/TopNav" on={["ALL", "md+"]}>
            Sticky, blurred, <code className="font-data text-[11px] text-ink">hidden md:block</code>.
            Carries the wordmark, the four primary tabs, share and the user menu. Hidden on a
            handful of paths (auth, admin).
          </Documented>

          <Documented name="BottomNav" importPath="components/layout/BottomNav" on={["ALL", "mobile"]}>
            The mobile counterpart: Now · Next · Cams · More, from the same{" "}
            <code className="font-data text-[11px] text-ink">navTabs</code> source as TopNav so the
            two can never disagree about what the primary destinations are.
          </Documented>

          <Documented
            name="WebcamCard / WebcamFullscreen / TvMode / LiveCam"
            importPath="components/webcam/*, components/now/LiveCam"
            on={["NOW", "CAMS"]}
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
            name="useNowData"
            importPath="components/now/useNowData"
            on={["NOW"]}
          >
            Not a component — the hook that answers Now. Takes{" "}
            <code className="font-data text-[11px] text-ink">(sport, favoriteIds)</code> and
            returns the chosen spot, its current slot, three upcoming windows, station and
            model agreement, plus the two states that are not failures:{" "}
            <code className="font-data text-[11px] text-ink">needsFavorites</code> (no spots
            chosen yet) and <code className="font-data text-[11px] text-ink">noSpotForSport</code>{" "}
            (favourites exist but none do this sport). Slots are filtered through{" "}
            <code className="font-data text-[11px] text-ink">isChartedSlot</code> so Now and the
            week strip can never disagree about which hours exist.
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
