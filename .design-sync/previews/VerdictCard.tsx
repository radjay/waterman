import { VerdictCard, SportProvider } from 'waterman';

// The whole answer to "can I go", before anything else. GO paints in the
// accent, MAYBE in the caution hue, NO GO stays neutral — on a flat day the
// accent belongs to the next windows further down, not to the bad news.
//
// `metric` is what lib/conditions.primaryMetric returns; it is passed in rather
// than derived so the card stays sport-agnostic.
const wind = (value: number, gust: number, dir: number) => ({
  value,
  unit: 'kn',
  secondary: `(${gust}*)`,
  directionLabel: 'NNW',
  directionDegrees: dir,
  tertiary: null,
});

const swell = {
  value: 1.4,
  unit: 'm',
  secondary: 'E swell @ 9 s',
  directionLabel: null,
  directionDegrees: 100,
  tertiary: 'wind 6 kn NNW',
};

// The sport chip inside the card reads from SportProvider.
const Stage = ({ children }: { children: React.ReactNode }) => (
  <SportProvider>
    <div className="max-w-[520px]">{children}</div>
  </SportProvider>
);

export const Go = () => (
  <Stage>
    <VerdictCard
      verdict="GO"
      sport="wingfoil"
      spotName="Praia do Guincho"
      score={92}
      metric={wind(18, 24, 340)}
      reason="HOLDING UNTIL ABOUT 18:00"
    />
  </Stage>
);

export const Maybe = () => (
  <Stage>
    <VerdictCard
      verdict="MARGINAL"
      sport="wingfoil"
      spotName="Marina de Cascais"
      score={58}
      metric={wind(11, 14, 320)}
      reason="LIGHT, BUT CLEAN"
    />
  </Stage>
);

export const NoGo = () => (
  <Stage>
    <VerdictCard
      verdict="NO"
      sport="wingfoil"
      spotName="Lagoa da Albufeira"
      score={22}
      metric={wind(4, 6, 210)}
      reason="NOTHING ON"
    />
  </Stage>
);

// Surf leads with swell height and keeps wind as context — onshore wind is what
// ruins an otherwise good swell, so it stays on the card without being the
// headline.
export const Surf = () => (
  <Stage>
    <VerdictCard
      verdict="GO"
      sport="surfing"
      spotName="Carcavelos"
      score={81}
      metric={swell}
      reason="OFFSHORE ALL MORNING"
    />
  </Stage>
);
