import { SportBadge, ScoreDisplay } from 'waterman';

export const Sports = () => (
  <div className="flex flex-wrap items-center gap-8">
    <div className="flex flex-col items-center gap-1.5">
      <SportBadge sport="wingfoil" size={28} className="text-ink" />
      <span className="font-body text-[11px] text-faded-ink">Wingfoil</span>
    </div>
    <div className="flex flex-col items-center gap-1.5">
      <SportBadge sport="kitesurfing" size={28} className="text-ink" />
      <span className="font-body text-[11px] text-faded-ink">Kitesurfing</span>
    </div>
    <div className="flex flex-col items-center gap-1.5">
      <SportBadge sport="surfing" size={28} className="text-ink" />
      <span className="font-body text-[11px] text-faded-ink">Surfing</span>
    </div>
  </div>
);

export const Sizes = () => (
  <div className="flex flex-wrap items-end gap-6">
    <SportBadge sport="wingfoil" size={14} className="text-ink" />
    <SportBadge sport="wingfoil" size={20} className="text-ink" />
    <SportBadge sport="wingfoil" size={28} className="text-ink" />
    <SportBadge sport="wingfoil" size={40} className="text-ink" />
  </div>
);

export const Tones = () => (
  <div className="flex flex-wrap items-center gap-6">
    <SportBadge sport="kitesurfing" size={24} className="text-ink" />
    <SportBadge sport="kitesurfing" size={24} className="text-faded-ink" />
    <SportBadge sport="kitesurfing" size={24} />
    <SportBadge sport="kitesurfing" size={24} className="text-red-accent" />
  </div>
);

export const InSpotRows = () => (
  <div className="flex max-w-sm flex-col gap-2">
    <div className="flex items-center gap-3 border-b border-ink/15 pb-2">
      <SportBadge sport="wingfoil" size={18} className="text-ink/60" />
      <span className="flex-1 font-body text-sm text-ink">Scheveningen Noord</span>
      <span className="font-data text-xs text-faded-ink">19 kt NW</span>
      <ScoreDisplay score={92} size="sm" />
    </div>
    <div className="flex items-center gap-3 border-b border-ink/15 pb-2">
      <SportBadge sport="kitesurfing" size={18} className="text-ink/60" />
      <span className="flex-1 font-body text-sm text-ink">Brouwersdam</span>
      <span className="font-data text-xs text-faded-ink">24 kt WSW</span>
      <ScoreDisplay score={84} size="sm" />
    </div>
    <div className="flex items-center gap-3">
      <SportBadge sport="surfing" size={18} className="text-ink/60" />
      <span className="flex-1 font-body text-sm text-ink">Wijk aan Zee</span>
      <span className="font-data text-xs text-faded-ink">1.4 m (9s)</span>
      <ScoreDisplay score={67} size="sm" />
    </div>
  </div>
);
