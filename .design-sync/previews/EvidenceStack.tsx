import { EvidenceStack } from 'waterman';

// "Why we think so" — the evidence under the verdict, ordered by how much a
// rider trusts it. The stack must read as complete with only the cards it can
// fill: most spots have neither a cam nor a live station, and one honest card is
// a legitimate screen where three skeletons that never resolve are not.
// History points carry `time` (epoch ms) as well as a speed: StationCard draws
// them through StationWindChart, whose x-axis is Lisbon wall-clock time, so a
// bare list of speeds plots nothing.
const START = Date.UTC(2026, 6, 14, 9, 0); // 10:00 in Lisbon

const STATION = {
  speed: 19.4,
  gust: 25,
  directionLabel: 'NNW',
  delta: 2,
  agoLabel: '8 MIN AGO',
  caption: 'Windguru station 4021',
  history: [
    14, 14.8, 15.4, 16.1, 16.8, 17.2, 17.9, 18.4, 18.8, 19.3, 19.7, 20.1, 20.4,
    20.8, 21.1, 20.7, 20.3, 19.9, 19.6, 19.4,
  ].map((speed, i) => ({
    time: START + i * 10 * 60_000,
    speed,
    gust: Math.round(speed * 1.29 * 10) / 10,
  })),
};

export const StationReading = () => (
  <div className="max-w-md">
    <EvidenceStack
      station={STATION}
      reasoning="Steady 18–21 kn NNW through the afternoon with a short chop; the tide turns at 16:20 and softens the inside."
    />
  </div>
);

// No station, no models — the scorer's own explanation backstops the stack so
// "why we think so" never answers with silence.
export const ForecastOnly = () => (
  <div className="max-w-md">
    <EvidenceStack reasoning="Wind is a mellow 11 kn and rock-steady, so the wing will feel smooth but a bit light — perfect for cruising." />
  </div>
);

export const WithModelAgreement = () => (
  <div className="max-w-md">
    <EvidenceStack
      station={STATION}
      agreement={{
        band: 'good',
        agreed: 4,
        total: 5,
        models: [
          { model: 'gfs27_long', vote: true },
          { model: 'ecmwf', vote: true },
          { model: 'iconeuro', vote: false },
          { model: 'iconglobal', vote: true },
          { model: 'lew', vote: true },
        ],
      }}
      reasoning="Steady 18–21 kn NNW through the afternoon."
    />
  </div>
);
