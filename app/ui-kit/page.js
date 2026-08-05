"use client";

import { useState } from "react";
import { Heading } from "../../components/ui/Heading";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { Divider } from "../../components/ui/Divider";
import { Section } from "../../components/ui/Section";
import { ScoreDisplay } from "../../components/ui/ScoreDisplay";
import { SportBadge } from "../../components/ui/SportBadge";
import { PillToggle } from "../../components/ui/PillToggle";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { ScoreDial } from "../../components/ui/ScoreDial";
import { useTheme } from "../../components/theme/ThemeProvider";
import { ScoreCard } from "../../components/ui/ScoreCard";
import { ConditionLine } from "../../components/ui/ConditionLine";
import { Tooltip } from "../../components/ui/Tooltip";
import { Modal } from "../../components/ui/Modal";
import { Loader } from "../../components/common/Loader";
import { EmptyState } from "../../components/common/EmptyState";
import { WindGroup } from "../../components/forecast/WindGroup";
import { WaveGroup } from "../../components/forecast/WaveGroup";
import { DirectionIndicator } from "../../components/forecast/DirectionIndicator";
import { TideDisplay } from "../../components/tide/TideDisplay";
import {
  ArrowRight,
  Plus,
  Trash2,
  Search,
  Wind,
  Waves,
  Settings,
  Video,
} from "lucide-react";

function Swatch({ className, name }) {
  return (
    <div>
      <div className={`h-16 rounded-card mb-2 ${className}`} />
      <Text variant="caption">{name}</Text>
    </div>
  );
}

/**
 * Night/Day switch. This is a review control, not a product feature — the app
 * follows local sunrise/sunset with an Auto/Night/Day preference in Settings.
 * Having it here is what makes both themes checkable in one pass.
 */
function ThemeSwitch() {
  const { theme, preference, setPreference } = useTheme();
  return (
    <div className="flex items-center gap-3 mb-8">
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

function KitSection({ title, children }) {
  return (
    <div className="mb-12">
      <h2 className="font-headline text-2xl font-bold text-ink mb-1">{title}</h2>
      <Divider weight="heavy" className="mb-6" />
      {children}
    </div>
  );
}

function ComponentRow({ label, importPath, children }) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-4 mb-2">{children}</div>
      <div className="flex items-center gap-3 mt-1">
        <span className="font-body text-xs text-ink/40">{label}</span>
        {importPath && (
          <code className="font-body text-[0.65rem] text-ink/30 bg-ink/5 px-1.5 py-0.5 rounded">
            {importPath}
          </code>
        )}
      </div>
    </div>
  );
}

export default function UIKitPage() {
  const [selectedSport, setSelectedSport] = useState("wingfoil");
  const [selectedFilter, setSelectedFilter] = useState("best");
  const [inputValue, setInputValue] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState("md");

  return (
    <div className="max-w-[900px] mx-auto px-6 py-12 bg-newsprint min-h-screen">
      <div className="mb-12">
        <h1 className="font-headline text-4xl font-extrabold text-ink mb-2 tracking-display-tight">
          UI Kit
        </h1>
        <Text variant="muted" className="mb-6">
          All shared components used across The Waterman Report. Pages should only import from
          this kit.
        </Text>
        <ThemeSwitch />
      </div>

      {/* ============ TYPOGRAPHY ============ */}
      <KitSection title="Typography">
        <ComponentRow label="Heading level={1}" importPath="components/ui/Heading">
          <Heading level={1}>Page Title (H1)</Heading>
        </ComponentRow>
        <ComponentRow label="Heading level={2}">
          <Heading level={2}>Section Title (H2)</Heading>
        </ComponentRow>
        <ComponentRow label="Heading level={3}">
          <Heading level={3}>Subsection (H3)</Heading>
        </ComponentRow>
        <ComponentRow label="Heading level={4}">
          <Heading level={4}>Spot Name / Label (H4)</Heading>
        </ComponentRow>

        <Divider weight="light" className="my-6" />

        <ComponentRow label='Text variant="body"' importPath="components/ui/Text">
          <Text>Standard body text in Space Grotesk. Clean and modern.</Text>
        </ComponentRow>
        <ComponentRow label='Text variant="muted"'>
          <Text variant="muted">Muted secondary text for descriptions.</Text>
        </ComponentRow>
        <ComponentRow label='Text variant="caption"'>
          <Text variant="caption">Caption text for metadata and timestamps.</Text>
        </ComponentRow>
        <ComponentRow label='Text variant="label"'>
          <Text variant="label">Label text for categories</Text>
        </ComponentRow>

        <Divider weight="light" className="my-6" />

        <ComponentRow label="font-data (JetBrains Mono for numerical data)" importPath="tailwind: font-data">
          <span className="font-data text-ink">14 kn (19*) SSW | 1.6m 8s</span>
        </ComponentRow>

        <ComponentRow label="Dual font system">
          <div className="space-y-2">
            <Text variant="caption">Body text (Space Grotesk) for prose and UI labels</Text>
            <span className="font-data text-xs text-faded-ink">Data readout (JetBrains Mono) for wind, waves, scores</span>
          </div>
        </ComponentRow>
      </KitSection>

      {/* ============ BUTTONS ============ */}
      <KitSection title="Buttons">
        <ComponentRow label="Variants" importPath="components/ui/Button">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="icon" aria-label="Settings">
            <Settings size={16} />
          </Button>
        </ComponentRow>

        <ComponentRow label="Sizes">
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="lg">Large</Button>
        </ComponentRow>

        <ComponentRow label="With icons">
          <Button variant="secondary" icon={Plus}>Add Item</Button>
          <Button variant="ghost" icon={ArrowRight} size="sm">See All</Button>
          <Button variant="danger" icon={Trash2}>Delete</Button>
        </ComponentRow>

        <ComponentRow label="Disabled">
          <Button variant="primary" disabled>Disabled Primary</Button>
          <Button variant="secondary" disabled>Disabled Secondary</Button>
        </ComponentRow>

        <ComponentRow label="Loading state">
          <Button variant="primary" loading>Saving...</Button>
          <Button variant="secondary" loading>Loading</Button>
        </ComponentRow>

        <ComponentRow label="Full width">
          <div className="w-full max-w-xs">
            <Button variant="primary" fullWidth>Full Width Button</Button>
          </div>
        </ComponentRow>

        <ComponentRow label="Full width + loading + icon">
          <div className="w-full max-w-xs">
            <Button variant="primary" fullWidth loading icon={Plus}>Creating...</Button>
          </div>
        </ComponentRow>

        <ComponentRow label="Focus states (Tab to see focus rings)">
          <Button variant="primary">Tab to me</Button>
          <Button variant="secondary">Tab to me</Button>
          <Input placeholder="Tab to me" className="max-w-[160px]" />
        </ComponentRow>
      </KitSection>

      {/* ============ DIVIDERS ============ */}
      <KitSection title="Dividers">
        <ComponentRow label='Divider weight="light"' importPath="components/ui/Divider">
          <div className="w-full">
            <Text variant="caption" className="mb-2">Light</Text>
            <Divider weight="light" />
          </div>
        </ComponentRow>
        <ComponentRow label='weight="medium"'>
          <div className="w-full">
            <Text variant="caption" className="mb-2">Medium (default)</Text>
            <Divider weight="medium" />
          </div>
        </ComponentRow>
        <ComponentRow label='weight="heavy"'>
          <div className="w-full">
            <Text variant="caption" className="mb-2">Heavy</Text>
            <Divider weight="heavy" />
          </div>
        </ComponentRow>
      </KitSection>

      {/* ============ SCORES & INDICATORS ============ */}
      <KitSection title="Scores & Indicators">
        <ComponentRow
          label="ScoreDisplay - colored score numbers"
          importPath="components/ui/ScoreDisplay"
        >
          <div className="flex items-center gap-6">
            <div className="text-center">
              <ScoreDisplay score={55} size="lg" />
              <Text variant="caption" className="mt-1">55 (hidden)</Text>
            </div>
            <div className="text-center">
              <ScoreDisplay score={65} size="lg" />
              <Text variant="caption" className="mt-1">65 Good</Text>
            </div>
            <div className="text-center">
              <ScoreDisplay score={78} size="lg" />
              <Text variant="caption" className="mt-1">78 Excellent</Text>
            </div>
            <div className="text-center">
              <ScoreDisplay score={92} size="lg" />
              <Text variant="caption" className="mt-1">92 Epic</Text>
            </div>
          </div>
        </ComponentRow>

        <ComponentRow label="ScoreDisplay sizes">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <ScoreDisplay score={78} size="sm" />
              <Text variant="caption">sm</Text>
            </div>
            <div className="flex items-center gap-2">
              <ScoreDisplay score={78} size="md" />
              <Text variant="caption">md</Text>
            </div>
            <div className="flex items-center gap-2">
              <ScoreDisplay score={78} size="lg" />
              <Text variant="caption">lg</Text>
            </div>
          </div>
        </ComponentRow>

        <ComponentRow label="SportBadge" importPath="components/ui/SportBadge">
          <SportBadge sport="wingfoil" />
          <SportBadge sport="kitesurfing" />
          <SportBadge sport="surfing" />
        </ComponentRow>
      </KitSection>

      {/* ============ CONTROLS ============ */}
      <KitSection title="Controls">
        <ComponentRow label="PillToggle - sport selector" importPath="components/ui/PillToggle">
          <PillToggle
            options={[
              { id: "wingfoil", label: "Wing" },
              { id: "kitesurfing", label: "Kite" },
              { id: "surfing", label: "Surf" },
            ]}
            value={selectedSport}
            onChange={setSelectedSport}
          />
        </ComponentRow>

        <ComponentRow label="PillToggle - filter">
          <PillToggle
            options={[
              { id: "best", label: "Best" },
              { id: "all", label: "All" },
            ]}
            value={selectedFilter}
            onChange={setSelectedFilter}
          />
        </ComponentRow>

        <ComponentRow label="PillToggle - with All option">
          <PillToggle
            options={[
              { id: "", label: "All" },
              { id: "wingfoil", label: "Wing" },
              { id: "kitesurfing", label: "Kite" },
              { id: "surfing", label: "Surf" },
            ]}
            value={selectedSport}
            onChange={setSelectedSport}
          />
        </ComponentRow>

        <ComponentRow label="Input" importPath="components/ui/Input">
          <Input
            placeholder="Search spots..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="max-w-xs"
          />
        </ComponentRow>

        <ComponentRow label="Input with icon">
          <Input
            icon={Search}
            placeholder="Search spots..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="max-w-xs"
          />
        </ComponentRow>

        <ComponentRow label="Input multiline (textarea)">
          <Input
            multiline
            rows={3}
            placeholder="Write your session notes..."
            value=""
            onChange={() => {}}
            className="max-w-sm"
          />
        </ComponentRow>

        <ComponentRow label="Input readOnly">
          <Input
            value="read-only@example.com"
            readOnly
            className="max-w-xs"
          />
        </ComponentRow>

        <ComponentRow label="Input disabled">
          <Input
            placeholder="Disabled input"
            disabled
            className="max-w-xs"
          />
        </ComponentRow>

        <ComponentRow label="Tooltip" importPath="components/ui/Tooltip">
          <Tooltip content="60-74 Good | 75-89 Excellent | 90+ Epic">
            <span className="font-body text-sm text-ink/60 underline decoration-dotted cursor-help">
              Hover for score scale
            </span>
          </Tooltip>
        </ComponentRow>
      </KitSection>

      {/* ============ CARDS ============ */}
      <KitSection title="Cards">
        <ComponentRow label="Card variants" importPath="components/ui/Card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <Card>
              <Heading level={4}>Default Card</Heading>
              <Text variant="muted" className="mt-1">Static content container.</Text>
            </Card>
            <Card variant="interactive" onClick={() => {}}>
              <Heading level={4}>Interactive Card</Heading>
              <Text variant="muted" className="mt-1">Clickable with hover state.</Text>
            </Card>
            <Card variant="elevated">
              <Heading level={4}>Elevated Card</Heading>
              <Text variant="muted" className="mt-1">With shadow for emphasis.</Text>
            </Card>
          </div>
        </ComponentRow>

        <ComponentRow label="ScoreCard at different scores" importPath="components/ui/ScoreCard">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <ScoreCard score={65} onClick={() => {}}>
              <div className="flex justify-between items-center">
                <div>
                  <Heading level={4}>Carcavelos</Heading>
                  <Text variant="caption">09:00</Text>
                </div>
                <ScoreDisplay score={65} size="lg" />
              </div>
            </ScoreCard>
            <ScoreCard score={78} onClick={() => {}}>
              <div className="flex justify-between items-center">
                <div>
                  <Heading level={4}>Praia do Guincho</Heading>
                  <Text variant="caption">15:00</Text>
                </div>
                <ScoreDisplay score={78} size="lg" />
              </div>
            </ScoreCard>
            <ScoreCard score={95} onClick={() => {}}>
              <div className="flex justify-between items-center">
                <div>
                  <Heading level={4}>Marina de Cascais</Heading>
                  <Text variant="caption">12:00</Text>
                </div>
                <ScoreDisplay score={95} size="lg" />
              </div>
            </ScoreCard>
          </div>
        </ComponentRow>
      </KitSection>

      {/* ============ SECTION ============ */}
      <KitSection title="Section Layout">
        <ComponentRow label="Section with title and action" importPath="components/ui/Section">
          <div className="w-full border border-dashed border-ink/20 rounded-lg p-4">
            <Section
              title="Today's Best Conditions"
              action={
                <Button variant="ghost" icon={ArrowRight} size="sm">
                  See All
                </Button>
              }
            >
              <Text variant="muted">Section content goes here...</Text>
            </Section>
          </div>
        </ComponentRow>

        <ComponentRow label="Section with divider">
          <div className="w-full border border-dashed border-ink/20 rounded-lg p-4">
            <Section title="Live Webcams" divided>
              <Text variant="muted">Divided section content...</Text>
            </Section>
          </div>
        </ComponentRow>
      </KitSection>

      {/* ============ DATA DISPLAY ============ */}
      <KitSection title="Data Display">
        <ComponentRow
          label="ConditionLine - wind sport"
          importPath="components/ui/ConditionLine"
        >
          <ConditionLine
            speed={14}
            gust={19}
            direction={210}
            waveHeight={1.6}
            wavePeriod={8}
            sport="wingfoil"
          />
        </ComponentRow>

        <ComponentRow label="ConditionLine - surfing">
          <ConditionLine
            speed={5}
            gust={8}
            direction={180}
            waveHeight={1.8}
            wavePeriod={12}
            sport="surfing"
          />
        </ComponentRow>

        <ComponentRow label="WindGroup" importPath="components/forecast/WindGroup">
          <WindGroup speed={14} gust={19} direction={210} />
        </ComponentRow>

        <ComponentRow label="WaveGroup" importPath="components/forecast/WaveGroup">
          <WaveGroup waveHeight={1.6} wavePeriod={8} waveDirection={300} />
        </ComponentRow>

        <ComponentRow
          label="DirectionIndicator"
          importPath="components/forecast/DirectionIndicator"
        >
          <div className="flex items-center gap-6">
            <DirectionIndicator direction={0} />
            <DirectionIndicator direction={45} />
            <DirectionIndicator direction={90} />
            <DirectionIndicator direction={135} />
            <DirectionIndicator direction={180} />
            <DirectionIndicator direction={225} />
            <DirectionIndicator direction={270} />
            <DirectionIndicator direction={315} />
          </div>
        </ComponentRow>

        <ComponentRow label="TideDisplay" importPath="components/tide/TideDisplay">
          <div className="flex items-center gap-6">
            <TideDisplay tide={{ isExactTime: true, time: "14:30", height: 3.2, isRising: true }} />
            <TideDisplay tide={{ isExactTime: true, time: "20:15", height: 0.8, isRising: false }} />
            <TideDisplay tide={{ isRising: true }} />
            <TideDisplay tide={{ isFalling: true }} />
          </div>
        </ComponentRow>
      </KitSection>

      {/* ============ FEEDBACK ============ */}
      <KitSection title="Feedback">
        <ComponentRow label="Loader" importPath="components/common/Loader">
          <Loader />
        </ComponentRow>

        <ComponentRow label="EmptyState" importPath="components/common/EmptyState">
          <div className="w-full max-w-sm">
            <EmptyState />
          </div>
        </ComponentRow>
      </KitSection>

      {/* ============ MODALS & OVERLAYS ============ */}
      <KitSection title="Modals & Overlays">
        <ComponentRow label="Modal sizes" importPath="components/ui/Modal">
          <div className="flex items-center gap-3">
            {["sm", "md", "lg"].map((size) => (
              <Button
                key={size}
                variant="secondary"
                onClick={() => { setModalSize(size); setModalOpen(true); }}
              >
                {size.toUpperCase()} Modal
              </Button>
            ))}
          </div>
        </ComponentRow>

        <ComponentRow label="Styling">
          <div className="space-y-1">
            <Text variant="caption">Backdrop: bg-ink/40 backdrop-blur-sm</Text>
            <Text variant="caption">Panel: bg-surface rounded-card-lg border-card</Text>
            <Text variant="caption">Sizes: sm (420px) · md (560px) · lg (672px)</Text>
          </div>
        </ComponentRow>

        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size={modalSize}>
          <div className="p-8">
            <Heading level={3}>Example Modal ({modalSize.toUpperCase()})</Heading>
            <Text variant="muted" className="mt-2">
              A lightweight, composable modal with click-outside dismiss, close button,
              body scroll lock, and three size presets.
            </Text>
            <div className="mt-6 flex gap-3">
              <Button variant="primary" onClick={() => setModalOpen(false)}>Got it</Button>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      </KitSection>

      {/* ============ THEME TOKENS ============ */}
      <KitSection title="Theme Tokens">
        <Text variant="muted" className="mb-6 text-sm">
          Every colour resolves through a CSS custom property, so this whole page
          re-paints when the theme flips. Use the Night/Day switch above to check
          both — the accent deliberately shifts a long way between them
          (#6EE7F0 to #0E7A85) because cyan on white is about 1.3:1.
        </Text>

        <ComponentRow label="Surfaces" importPath="app/theme.css">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Swatch className="bg-page border border-card" name="page" />
            <Swatch className="bg-surface border border-card" name="surface" />
            <Swatch className="bg-ink-hover border border-card" name="ink-hover" />
            <Swatch className="bg-offline-bg border border-card" name="offline-bg" />
          </div>
        </ComponentRow>

        <ComponentRow label="Text">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Swatch className="bg-ink" name="ink (primary)" />
            <Swatch className="bg-faded-ink" name="faded-ink (muted)" />
            <Swatch className="bg-dim" name="dim" />
            <div>
              <div className="h-16 rounded-card border border-card flex flex-col justify-center px-3 gap-1 mb-2">
                <span className="text-ink text-xs">primary</span>
                <span className="text-faded-ink text-xs">muted</span>
                <span className="text-dim text-xs">dim</span>
              </div>
              <Text variant="caption">in context</Text>
            </div>
          </div>
        </ComponentRow>

        <ComponentRow label="Accent">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Swatch className="bg-accent" name="accent" />
            <Swatch className="bg-accent-mid" name="accent-mid" />
            <Swatch className="bg-accent-low" name="accent-low" />
            <Swatch className="bg-accent-faint" name="accent-faint" />
            <Swatch className="bg-accent-tint border border-accent-border" name="accent-tint (nav)" />
            <Swatch className="bg-accent-tint-card border border-accent-border" name="accent-tint-card" />
            <Swatch className="bg-track" name="track" />
            <Swatch className="bg-marginal" name="marginal" />
          </div>
        </ComponentRow>

        <ComponentRow label="Sport pill (needs its own token pair)">
          <div className="flex items-center gap-3">
            <span className="bg-sport-pill text-sport-pill-text font-data text-[10px] tracking-[0.08em] px-3 py-1.5 rounded-pill">
              WING
            </span>
            <span className="text-dim font-data text-[10px] tracking-[0.08em] px-3 py-1.5">KITE</span>
            <span className="text-dim font-data text-[10px] tracking-[0.08em] px-3 py-1.5">SURF</span>
            <Text variant="caption" className="ml-2">
              tinted at night, solid in day
            </Text>
          </div>
        </ComponentRow>
      </KitSection>

      {/* ============ SCORE DIAL ============ */}
      <KitSection title="Score Dial">
        <Text variant="muted" className="mb-6 text-sm">
          Replaces ScorePill. Accent at 60+, marginal 45-59, dim below 45 — so a
          flat day reads near-empty rather than alarming. Scores under 60 are
          hidden unless showAll is set.
        </Text>

        <ComponentRow label="Sizes" importPath="components/ui/ScoreDial">
          <div className="flex items-end gap-5">
            <div className="text-center">
              <ScoreDial score={92} size="xs" className="mx-auto mb-2" />
              <Text variant="caption">xs 36</Text>
            </div>
            <div className="text-center">
              <ScoreDial score={92} size="sm" className="mx-auto mb-2" />
              <Text variant="caption">sm 44</Text>
            </div>
            <div className="text-center">
              <ScoreDial score={92} size="md" className="mx-auto mb-2" />
              <Text variant="caption">md 52</Text>
            </div>
            <div className="text-center">
              <ScoreDial score={92} size="lg" label="SCORE" className="mx-auto mb-2" />
              <Text variant="caption">lg 74</Text>
            </div>
            <div className="text-center">
              <ScoreDial score={92} size="xl" label="BEST" className="mx-auto mb-2" />
              <Text variant="caption">xl 104</Text>
            </div>
          </div>
        </ComponentRow>

        <ComponentRow label="Bands">
          <div className="flex items-end gap-5">
            {[92, 75, 60, 52, 41, 19].map((s) => (
              <div key={s} className="text-center">
                <ScoreDial score={s} size="md" showAll className="mx-auto mb-2" />
                <Text variant="caption">{s}</Text>
              </div>
            ))}
          </div>
        </ComponentRow>

        <ComponentRow label="On a tinted card (inner disc must match the card)">
          <div className="bg-accent-tint-card border border-accent-border rounded-card-lg p-4 flex items-center gap-4">
            <ScoreDial score={84} size="md" on="card" />
            <div>
              <div className="font-data text-[9px] tracking-label-wide text-accent mb-1">NEXT WINDOW</div>
              <div className="font-headline font-bold text-lg text-ink tracking-display-tight">
                Thursday - Guincho
              </div>
              <div className="font-data text-[11px] text-faded-ink mt-0.5">from 11:00 - 24 kt NNW</div>
            </div>
          </div>
        </ComponentRow>
      </KitSection>

      {/* ============ DESIGN TOKENS ============ */}
      <KitSection title="Design Tokens">
        <ComponentRow label="Border Radius" importPath="tailwind.config.js">
          <div className="flex items-center gap-6 flex-wrap">
            {[
              ["rounded-ui", "8px"],
              ["rounded-card-sm", "14px"],
              ["rounded-card", "16px"],
              ["rounded-card-lg", "18px"],
              ["rounded-card-xl", "20px"],
              ["rounded-pill", "999px"],
            ].map(([cls, px]) => (
              <div key={cls} className="text-center">
                <div className={`w-16 h-16 border border-card bg-surface ${cls} mb-2`} />
                <Text variant="caption">{px}</Text>
              </div>
            ))}
          </div>
        </ComponentRow>

        <ComponentRow label="Elevation">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="w-20 h-16 bg-surface rounded-card border border-card mb-2" />
              <Text variant="caption">cards: border + fill, no shadow</Text>
            </div>
            <div className="text-center">
              <div className="w-20 h-16 bg-nav-bg rounded-pill border border-nav-border shadow-nav mb-2" />
              <Text variant="caption">nav: shadow in day only</Text>
            </div>
            <div className="text-center">
              <div className="w-20 h-16 bg-surface rounded-card shadow-focus border border-card mb-2" />
              <Text variant="caption">shadow-focus</Text>
            </div>
          </div>
        </ComponentRow>

        <ComponentRow label="Mono labels (the contrast-critical treatment)">
          <div className="flex flex-col gap-2">
            <span className="font-data text-[9px] tracking-label-wide text-dim uppercase">
              9px / .22em / dim — WHY WE THINK SO
            </span>
            <span className="font-data text-[10px] tracking-label text-accent uppercase">
              10px / .16em / accent — IN THE WATER
            </span>
            <span className="font-data text-[11px] tracking-label text-faded-ink uppercase">
              11px / .16em / muted — GUINCHO - HOLDING UNTIL ABOUT 15:00
            </span>
          </div>
        </ComponentRow>

        <ComponentRow label="Transitions">
          <div className="flex items-center gap-6 flex-wrap">
            <Text variant="caption">duration-fast: 120ms</Text>
            <Text variant="caption">duration-base: 200ms</Text>
            <Text variant="caption">duration-slow: 300ms</Text>
            <Text variant="caption">ease-smooth: cubic-bezier(0.25, 0.1, 0.25, 1)</Text>
          </div>
        </ComponentRow>
      </KitSection>

      <Divider weight="heavy" className="mt-12 mb-6" />
      <Text variant="caption" className="text-center pb-8">
        Waterman UI Kit — Bricolage Grotesque for display, Space Grotesk for UI,
        JetBrains Mono for every number.
      </Text>
    </div>
  );
}
