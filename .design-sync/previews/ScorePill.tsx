import { ScorePill } from 'waterman';

export const ScoreRange = () => (
  <div className="flex flex-wrap items-center gap-3">
    <ScorePill score={94} sport="wingfoil" />
    <ScorePill score={81} sport="kitesurfing" />
    <ScorePill score={64} sport="surfing" />
    <ScorePill score={42} sport="wingfoil" showAll />
  </div>
);

export const Sizes = () => (
  <div className="flex flex-wrap items-center gap-3">
    <ScorePill score={88} sport="wingfoil" size="sm" />
    <ScorePill score={88} sport="wingfoil" size="md" />
    <ScorePill score={88} sport="wingfoil" size="lg" />
    <ScorePill score={88} sport="wingfoil" size="xl" />
  </div>
);

export const Sports = () => (
  <div className="flex flex-wrap items-center gap-3">
    <ScorePill score={76} sport="wingfoil" size="lg" />
    <ScorePill score={76} sport="kitesurfing" size="lg" />
    <ScorePill score={76} sport="surfing" size="lg" />
  </div>
);

export const Clickable = () => (
  <div className="flex flex-wrap items-center gap-3">
    <ScorePill score={91} sport="kitesurfing" size="lg" onClick={() => {}} />
    <ScorePill score={58} sport="surfing" size="lg" showAll onClick={() => {}} />
  </div>
);
