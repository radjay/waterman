import { ConditionLine, SportBadge } from 'waterman';

export const WindSports = () => (
  <div className="flex flex-col gap-2">
    <ConditionLine speed={19} gust={26} direction={315} waveHeight={0.8} wavePeriod={6} sport="wingfoil" />
    <ConditionLine speed={24} gust={31} direction={247} waveHeight={0.5} wavePeriod={5} sport="kitesurfing" />
    <ConditionLine speed={11} gust={15} direction={200} waveHeight={0.3} wavePeriod={4} sport="wingfoil" />
  </div>
);

export const Surfing = () => (
  <div className="flex flex-col gap-2">
    <ConditionLine speed={7} direction={110} waveHeight={1.4} wavePeriod={9} sport="surfing" />
    <ConditionLine speed={12} direction={45} waveHeight={0.9} wavePeriod={7} sport="surfing" />
    <ConditionLine speed={5} direction={135} waveHeight={1.9} wavePeriod={11} sport="surfing" />
  </div>
);

export const PartialData = () => (
  <div className="flex flex-col gap-2">
    <ConditionLine speed={22} gust={29} direction={290} sport="wingfoil" />
    <ConditionLine speed={18} direction={225} sport="kitesurfing" />
    <ConditionLine waveHeight={1.1} wavePeriod={8} sport="surfing" />
  </div>
);

export const InSpotList = () => (
  <div className="flex max-w-md flex-col gap-2">
    <div className="flex items-center gap-3 border-b border-ink/15 pb-2">
      <SportBadge sport="wingfoil" size={16} className="text-ink/50" />
      <span className="w-44 font-body text-sm text-ink">Scheveningen Noord</span>
      <ConditionLine speed={19} gust={26} direction={315} waveHeight={0.8} wavePeriod={6} sport="wingfoil" />
    </div>
    <div className="flex items-center gap-3 border-b border-ink/15 pb-2">
      <SportBadge sport="kitesurfing" size={16} className="text-ink/50" />
      <span className="w-44 font-body text-sm text-ink">Brouwersdam</span>
      <ConditionLine speed={24} gust={31} direction={247} waveHeight={0.5} wavePeriod={5} sport="kitesurfing" />
    </div>
    <div className="flex items-center gap-3">
      <SportBadge sport="surfing" size={16} className="text-ink/50" />
      <span className="w-44 font-body text-sm text-ink">Wijk aan Zee</span>
      <ConditionLine speed={7} direction={110} waveHeight={1.4} wavePeriod={9} sport="surfing" />
    </div>
  </div>
);
