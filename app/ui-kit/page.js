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
        <h1 className="font-headline text-4xl font-black text-ink mb-2">UI Kit</h1>
        <Text variant="muted">
          All shared components used across The Waterman Report. Pages should only import from
          this kit.
        </Text>
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
          <Text>Standard body text in Inter. Clean and modern.</Text>
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

        <ComponentRow label="font-data (Courier Prime for numerical data)" importPath="tailwind: font-data">
          <span className="font-data text-ink">14 kn (19*) SSW | 1.6m 8s</span>
        </ComponentRow>

        <ComponentRow label="Dual font system">
          <div className="space-y-2">
            <Text variant="caption">Body text (Inter) for prose and UI labels</Text>
            <span className="font-data text-xs text-faded-ink">Data readout (Courier Prime) for wind, waves, scores</span>
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
            <Text variant="caption">Backdrop: bg-black/60 backdrop-blur-sm</Text>
            <Text variant="caption">Panel: bg-newsprint rounded-2xl shadow-elevated border-ink/10</Text>
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

      {/* ============ COLOR PALETTE ============ */}
      <KitSection title="Color Palette">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="h-16 rounded-card bg-newsprint border border-ink/10 shadow-card mb-2" />
            <Text variant="caption">newsprint #f4f1ea</Text>
          </div>
          <div>
            <div className="h-16 rounded-card bg-ink mb-2" />
            <Text variant="caption">ink #1a1a1a</Text>
          </div>
          <div>
            <div className="h-16 rounded-card bg-ink-hover mb-2" />
            <Text variant="caption">ink-hover #2a2a2a</Text>
          </div>
          <div>
            <div className="h-16 rounded-card bg-faded-ink mb-2" />
            <Text variant="caption">faded-ink #4a4a4a</Text>
          </div>
          <div>
            <div className="h-16 rounded-card bg-warm-highlight border border-ink/10 mb-2" />
            <Text variant="caption">warm-highlight #f0ece3</Text>
          </div>
          <div>
            <div className="h-16 rounded-card bg-red-accent mb-2" />
            <Text variant="caption">red-accent #8b0000</Text>
          </div>
          <div>
            <div className="h-16 rounded-card bg-muted-yellow border border-ink/10 mb-2" />
            <Text variant="caption">muted-yellow #fef3c7</Text>
          </div>
        </div>

        <div className="mt-6">
          <Text variant="label" className="mb-3">Score Colors</Text>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="h-16 rounded-card bg-green-600 mb-2" />
              <Text variant="caption">Good (60-74)</Text>
            </div>
            <div>
              <div className="h-16 rounded-card bg-green-700 mb-2" />
              <Text variant="caption">Excellent (75-89)</Text>
            </div>
            <div>
              <div className="h-16 rounded-card bg-green-800 mb-2" />
              <Text variant="caption">Epic (90+)</Text>
            </div>
          </div>
        </div>
      </KitSection>

      {/* ============ DESIGN TOKENS ============ */}
      <KitSection title="Design Tokens">
        <ComponentRow label="Border Radius" importPath="tailwind.config.js">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="w-16 h-16 border border-ink/20 bg-warm-highlight rounded-ui mb-2" />
              <Text variant="caption">rounded-ui (6px)</Text>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 border border-ink/20 bg-warm-highlight rounded-card mb-2" />
              <Text variant="caption">rounded-card (10px)</Text>
            </div>
          </div>
        </ComponentRow>

        <ComponentRow label="Shadows">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="w-20 h-16 bg-newsprint rounded-card shadow-card border border-ink/10 mb-2" />
              <Text variant="caption">shadow-card</Text>
            </div>
            <div className="text-center">
              <div className="w-20 h-16 bg-newsprint rounded-card shadow-card-hover border border-ink/10 mb-2" />
              <Text variant="caption">shadow-card-hover</Text>
            </div>
            <div className="text-center">
              <div className="w-20 h-16 bg-newsprint rounded-card shadow-elevated border border-ink/10 mb-2" />
              <Text variant="caption">shadow-elevated</Text>
            </div>
            <div className="text-center">
              <div className="w-20 h-16 bg-newsprint rounded-card shadow-focus border border-ink/10 mb-2" />
              <Text variant="caption">shadow-focus</Text>
            </div>
          </div>
        </ComponentRow>

        <ComponentRow label="Transitions">
          <div className="flex items-center gap-6">
            <Text variant="caption">duration-fast: 120ms</Text>
            <Text variant="caption">duration-base: 200ms</Text>
            <Text variant="caption">duration-slow: 300ms</Text>
            <Text variant="caption">ease-smooth: cubic-bezier(0.25, 0.1, 0.25, 1)</Text>
          </div>
        </ComponentRow>
      </KitSection>

      <Divider weight="heavy" className="mt-12 mb-6" />
      <Text variant="caption" className="text-center pb-8">
        The Waterman Report UI Kit — Inter for UI, Courier Prime for data, Playfair Display for headlines.
      </Text>
    </div>
  );
}
