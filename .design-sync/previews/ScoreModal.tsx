import { ScoreModal } from 'waterman';

const noop = () => {};

// ScoreModal is a `fixed inset-0` overlay — it needs a stage with real height to
// centre itself in, otherwise it collapses onto a zero-height card root.
const Stage = ({ height, children }: { height: number; children: React.ReactNode }) => (
  <div style={{ minHeight: height, width: '100%' }}>{children}</div>
);

export const Default = () => (
  <Stage height={660}>
    <ScoreModal
      isOpen
      onClose={noop}
      spotName="Scheveningen Noord"
      slot={{ hour: '07:00', sport: 'wingfoil' }}
      score={{
        value: 87,
        reasoning:
          'A steady 19 kt from the north-west builds to 24 kt through the morning, with a gust factor of only 1.15 — cross-onshore and very rideable on a 5 m. The 0.8 m swell at 6 s gives clean ramps on the outside, and the tide is pushing in from 06:40 so the sandbar stays covered for the whole window.',
        factors: {
          windQuality: 92,
          waveQuality: 78,
          tideQuality: 85,
          overallConditions: 87,
        },
      }}
    />
  </Stage>
);

export const Personalized = () => (
  <Stage height={660}>
    <ScoreModal
      isOpen
      onClose={noop}
      spotName="Wijk aan Zee"
      slot={{ hour: '15:00', sport: 'kitesurfing' }}
      score={{
        _id: 'k57b3m1qz9xhd4v0ynp2eaqs',
        value: 94,
        isPersonalized: true,
        reasoning:
          'You log most of your kite sessions between 20 and 26 kt, and this one sits at 24 kt WSW — side-shore on a mid tide, like your 5-star session here on 14 May.',
        factors: {
          windQuality: 96,
          waveQuality: 71,
          tideQuality: 88,
          overallConditions: 94,
        },
      }}
    />
  </Stage>
);

export const LowScore = () => (
  <Stage height={640}>
    <ScoreModal
      isOpen
      onClose={noop}
      spotName="Zandvoort"
      slot={{ hour: '11:00', sport: 'surfing' }}
      score={{
        value: 38,
        reasoning:
          'Only 0.3 m of leftover windswell at 4 s, and the 15 kt onshore westerly puts chop straight onto the face. Low water at 12:55 pulls the bank dry mid-session. Worth skipping unless you are on a longboard.',
        factors: {
          windQuality: 31,
          waveQuality: 24,
          tideQuality: 55,
          overallConditions: 38,
        },
      }}
    />
  </Stage>
);

export const ReasoningOnly = () => (
  <Stage height={460}>
    <ScoreModal
      isOpen
      onClose={noop}
      spotName="Brouwersdam"
      slot={{ hour: '18:00', sport: 'wingfoil' }}
      score={{
        value: 66,
        reasoning:
          'Marginal but sailable: 16 kt WSW easing after sunset, flat water inside the dam. Big-wing session — 6 m or up.',
      }}
    />
  </Stage>
);
