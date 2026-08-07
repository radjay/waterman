import { VerdictCard, SportProvider } from 'waterman';

// The whole answer to "can I go", before anything else. The verdict word
// carries the colour — accent for GO, the caution hue for MAYBE, dim for NO GO
// — while the card shell stays neutral: tinting the whole box made the accent
// fight the score dials for attention.
//
// Wind and score are NOT card-level props any more. `score` and `metric` are
// still accepted for callers but ignored; the card renders a `trajectory` of
// the remaining slots today, each printing its own wind reading and dial, so
// now-vs-later is one comparison instead of two.
const HOUR = 3600_000;
const base = Date.UTC(2026, 6, 14, 11, 0); // 12:00 in Lisbon

// Trajectory slots are forecast slots: `primaryMetric(slot, sport)` reads
// speed/gust/direction for the wind sports and waveHeight/wavePeriod for surf.
const slot = (h: number, score: number | null, speed: number, gust: number) => ({
  timestamp: base + h * HOUR,
  score,
  speed,
  gust,
  direction: 160, // stored bearing; displayed as its opposite, NNW
});

// The sport chip inside the card reads from SportProvider. There is no stored
// selection in a preview, so it shows the default (WING) in every cell —
// including the surf story, where the card's own `sport` prop is what decides
// that the strip prints swell in metres.
// Sized like the real page container (MainLayout is max-w-[1200px] px-8). The
// trajectory strip is one row of equal columns from md up, and each column has
// to hold a wind reading and its dial side by side — squeeze the card and the
// compass label runs under the dial.
const Stage = ({ children }: { children: React.ReactNode }) => (
  <SportProvider>
    <div className="max-w-[860px]">{children}</div>
  </SportProvider>
);

// BEST marks the best-scoring slot on the strip, ties going to the earliest, so
// "when today" is answered without reading four numbers.
export const Go = () => (
  <Stage>
    <VerdictCard
      verdict="GO"
      sport="wingfoil"
      spotName="Praia do Guincho"
      reason="HOLDING UNTIL ABOUT 18:00"
      trajectory={[slot(0, 88, 18, 24), slot(3, 92, 21, 27), slot(6, 84, 19, 23)]}
    />
  </Stage>
);

// The measured station reading sits under the prose when the spot has one: the
// only number on the card that is not a model output.
export const GoWithStation = () => (
  <Stage>
    <VerdictCard
      verdict="GO"
      sport="wingfoil"
      spotName="Praia do Guincho"
      reasoning="Steady 18–21 kn NNW through the afternoon with a short chop; the tide turns at 16:20 and softens the inside."
      trajectory={[slot(0, 91, 20, 26), slot(3, 86, 18, 24)]}
      station={{
        speed: 20.4,
        gust: 26.1,
        directionLabel: 'NNW',
        delta: 2,
        agoLabel: '4 MIN AGO',
        caption: 'Windguru station 4021',
      }}
    />
  </Stage>
);

// An unscored slot prints an em dash rather than a zero — the scorer skips
// hours outside daylight, and that is not a bad hour.
export const Maybe = () => (
  <Stage>
    <VerdictCard
      verdict="MARGINAL"
      sport="wingfoil"
      spotName="Marina de Cascais"
      reason="LIGHT, BUT CLEAN"
      trajectory={[slot(0, 58, 11, 14), slot(3, 62, 13, 16), slot(6, null, 9, 12)]}
    />
  </Stage>
);

// On a flat day the card offers the way out instead of the accent: "3 windows
// elsewhere today" only appears on a NO GO.
export const NoGoWithElsewhere = () => (
  <Stage>
    <VerdictCard
      verdict="NO"
      sport="wingfoil"
      spotName="Lagoa de Albufeira"
      reason="NOTHING ON"
      trajectory={[slot(0, 22, 4, 6), slot(3, 18, 3, 5)]}
      elsewhereToday={3}
      onSeeElsewhere={() => {}}
    />
  </Stage>
);

// Surf leads with swell height and keeps wind as context — onshore wind is what
// ruins an otherwise good swell, so it stays in the reading without being the
// headline.
export const Surf = () => (
  <Stage>
    <VerdictCard
      verdict="GO"
      sport="surfing"
      spotName="Carcavelos"
      reason="OFFSHORE ALL MORNING"
      trajectory={[
        { timestamp: base, score: 81, waveHeight: 1.4, wavePeriod: 9, waveDirection: 280, speed: 6, direction: 160 },
        { timestamp: base + 3 * HOUR, score: 74, waveHeight: 1.2, wavePeriod: 9, waveDirection: 280, speed: 9, direction: 160 },
      ]}
    />
  </Stage>
);
