import { LiveEvidencePanel } from 'waterman';

// The "LIVE" section of the window screen: measured numbers first because they
// are actionable, then the cam as a fixed short strip for the scene. It carries
// the same small section label as HOUR BY HOUR and WHY THE SCORE so the page
// reads as a stack of equal sections rather than a score, a list, then a
// full-bleed beach.
//
// One story on purpose. The cam strip only appears when the spot resolves to a
// live HLS stream, and no stream resolves inside a preview — a fixture URL just
// makes hls.js retry until the capture times out (see NOTES.md). What renders
// here is the panel's other half, which is the half that carries the numbers.
const MIN = 60_000;
const START = Date.UTC(2026, 6, 14, 9, 0); // 10:00 in Lisbon

const SPEEDS = [
  15.1, 15.8, 16.2, 17, 17.4, 18, 18.3, 18.9, 19.4, 19.8, 20.2, 20.6, 21, 21.3,
  21.6, 21.2, 20.9, 21.4, 21.8, 22.1, 22.4, 22, 21.7, 21.3, 20.8, 20.4,
];

export const StationReading = () => (
  <div className="max-w-md">
    <LiveEvidencePanel
      spot={{ _id: 'guincho', name: 'Praia do Guincho' }}
      station={{
        speed: 20.4,
        gust: 26.1,
        directionLabel: 'NNW',
        delta: 2,
        agoLabel: '4 MIN AGO',
        caption: 'Windguru station 4021',
        history: SPEEDS.map((speed, i) => ({
          time: START + i * 10 * MIN,
          speed,
          gust: Math.round(speed * 1.28 * 10) / 10,
        })),
      }}
      score={88}
    />
  </div>
);
