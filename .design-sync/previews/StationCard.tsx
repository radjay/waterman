import { StationCard } from 'waterman';

// The measured reading inside "why we think so" — the one piece of evidence on
// the screen that is not a model output. Age and proximity share the meta line
// ("8 MIN AGO @ Windguru station 4021") because a station reading is only worth
// anything if you know how old it is and how far away it was taken.
const MIN = 60_000;
const START = Date.UTC(2026, 6, 14, 9, 0); // 10:00 in Lisbon

const SPEEDS = [
  14, 14.6, 15.1, 15.8, 16.2, 17, 17.4, 18, 18.3, 18.9, 19.4, 19.8, 20.2, 20.6,
  21, 21.3, 21.6, 21.2, 20.9, 21.4, 21.8, 22.1, 22.4, 22, 21.7, 21.3, 20.8,
  20.4, 20, 19.6,
];

const history = SPEEDS.map((speed, i) => ({
  time: START + i * 10 * MIN,
  speed,
  gust: Math.round(speed * 1.28 * 10) / 10,
}));

const station = {
  speed: 19.6,
  gust: 25.1,
  directionLabel: 'NNW',
  delta: 3,
  agoLabel: '8 MIN AGO',
  caption: 'Windguru station 4021',
  history,
};

// The full card: reading, how far it sits from the forecast, and the six hours
// behind it with its legend.
export const Reading = () => (
  <div className="max-w-md">
    <StationCard station={station} />
  </div>
);

// A station that has only just come back online has one sample and no shape to
// draw — the numbers are still the best evidence on the screen, so the card
// prints them and stops rather than showing an empty chart frame.
export const NumbersOnly = () => (
  <div className="max-w-md">
    <StationCard
      station={{
        speed: 11.2,
        gust: 14.8,
        directionLabel: 'N',
        delta: -2,
        agoLabel: '1 MIN AGO',
        caption: 'at the spot',
      }}
    />
  </div>
);

// `bare` drops the card chrome for when the block already sits inside one —
// the verdict card puts it at the same inset as its prose.
export const Bare = () => (
  <div className="max-w-md rounded-card-xl bg-surface border border-card px-4 py-[15px]">
    <div className="font-headline font-extrabold text-[28px] leading-none text-accent tracking-display-tighter">
      GO
    </div>
    <p className="text-[13px] leading-[1.45] text-faded-ink mt-2 mb-3">
      Holding around 20 kn NNW until the sea breeze eases after six.
    </p>
    <StationCard station={station} bare />
  </div>
);
