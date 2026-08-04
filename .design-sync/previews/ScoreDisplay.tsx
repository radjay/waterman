import { ScoreDisplay, SportBadge } from 'waterman';

export const ScoreRange = () => (
  <div className="flex flex-wrap items-baseline gap-8">
    <div className="flex flex-col items-center gap-1">
      <ScoreDisplay score={96} size="lg" />
      <span className="font-body text-[11px] text-faded-ink">Epic</span>
    </div>
    <div className="flex flex-col items-center gap-1">
      <ScoreDisplay score={88} size="lg" />
      <span className="font-body text-[11px] text-faded-ink">Strong</span>
    </div>
    <div className="flex flex-col items-center gap-1">
      <ScoreDisplay score={78} size="lg" />
      <span className="font-body text-[11px] text-faded-ink">Solid</span>
    </div>
    <div className="flex flex-col items-center gap-1">
      <ScoreDisplay score={64} size="lg" />
      <span className="font-body text-[11px] text-faded-ink">Sailable</span>
    </div>
  </div>
);

export const Sizes = () => (
  <div className="flex flex-wrap items-baseline gap-8">
    <ScoreDisplay score={91} size="sm" />
    <ScoreDisplay score={91} size="md" />
    <ScoreDisplay score={91} size="lg" />
  </div>
);

export const BelowThreshold = () => (
  <div className="flex max-w-sm flex-col gap-2">
    <div className="flex items-center justify-between border-b border-ink/15 pb-2">
      <span className="font-body text-sm text-ink">Scheveningen Noord</span>
      <ScoreDisplay score={82} />
    </div>
    <div className="flex items-center justify-between border-b border-ink/15 pb-2">
      <span className="font-body text-sm text-ink">Zandvoort</span>
      <ScoreDisplay score={61} />
    </div>
    <div className="flex items-center justify-between">
      <span className="font-body text-sm text-faded-ink">Ijmuiden</span>
      <span className="flex items-center gap-2">
        <ScoreDisplay score={47} />
        <span className="font-data text-xs text-ink/40">no score under 60</span>
      </span>
    </div>
  </div>
);

export const InForecastRow = () => (
  <div className="flex max-w-md flex-col gap-3">
    <div className="flex items-center gap-3 rounded-card border border-ink/10 p-3 shadow-card">
      <SportBadge sport="wingfoil" size={18} className="text-ink/60" />
      <div className="flex-1">
        <div className="font-body text-sm text-ink">Scheveningen Noord</div>
        <div className="font-data text-xs text-faded-ink">19 kn (26*) NW | 0.8m (6s)</div>
      </div>
      <ScoreDisplay score={94} size="lg" />
    </div>
    <div className="flex items-center gap-3 rounded-card border border-ink/10 p-3 shadow-card">
      <SportBadge sport="kitesurfing" size={18} className="text-ink/60" />
      <div className="flex-1">
        <div className="font-body text-sm text-ink">Brouwersdam</div>
        <div className="font-data text-xs text-faded-ink">24 kn (31*) WSW | 0.5m (5s)</div>
      </div>
      <ScoreDisplay score={76} size="lg" />
    </div>
  </div>
);
