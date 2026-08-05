import { ScoreDial } from 'waterman';

// Replaced ScorePill. NOT a <button> even when clickable — it renders inside
// ScoreCard, which is itself a button, and a nested button fails hydration.

export const Sizes = () => (
  <div className="flex items-end gap-6">
    {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
      <div key={size} className="text-center">
        <ScoreDial score={92} size={size} className="mx-auto mb-2" />
        <span className="font-data text-[10px] text-dim">{size}</span>
      </div>
    ))}
  </div>
);

export const Bands = () => (
  <div className="flex items-end gap-6">
    {[92, 75, 60, 52, 41, 19].map((score) => (
      <div key={score} className="text-center">
        <ScoreDial score={score} size="md" showAll className="mx-auto mb-2" />
        <span className="font-data text-[10px] text-dim">{score}</span>
      </div>
    ))}
  </div>
);

// Accent at 60+, the marginal hue 45–59, dim below 45 — a flat day reads as
// near-empty rather than alarming.
export const HiddenBelowSixty = () => (
  <div className="flex items-center gap-6">
    <div className="text-center">
      <ScoreDial score={44} size="md" className="mx-auto mb-2" />
      <span className="font-data text-[10px] text-dim">44, no showAll — renders nothing</span>
    </div>
    <div className="text-center">
      <ScoreDial score={44} size="md" showAll className="mx-auto mb-2" />
      <span className="font-data text-[10px] text-dim">44, showAll</span>
    </div>
  </div>
);

export const WithLabelAndSport = () => (
  <div className="flex items-center gap-6">
    <ScoreDial score={88} size="lg" label="NOW" />
    <ScoreDial score={95} size="xl" label="BEST" />
    <ScoreDial score={81} size="lg" sport="wingfoil" />
  </div>
);

// `on="card"` matches the inner disc to a tinted card. On the page default it
// punches a page-coloured hole and reads as a sticker.
export const OnATintedCard = () => (
  <div className="bg-accent-tint-card border border-accent-border rounded-card-lg p-4 flex items-center gap-4 max-w-[420px]">
    <ScoreDial score={84} size="md" on="card" label="NOW" />
    <div>
      <div className="font-headline font-bold text-[15px] text-ink tracking-display">
        Praia do Guincho
      </div>
      <div className="font-data text-[11px] text-faded-ink mt-0.5">Today 12:00–18:00</div>
    </div>
  </div>
);
