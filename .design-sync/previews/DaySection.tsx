import { DaySection } from 'waterman';

// Capture clock is fixed to 2024-05-15 (a Wednesday) — DaySection derives its
// own header from the first slot's timestamp and only shows the live-report
// affordance for today/tomorrow, so fixtures must sit on that date.
const at = (hour: number, minute = 0) => Date.UTC(2024, 4, 15, hour, minute, 0);

const score = (value: number, isPersonalized = false) => ({
  _id: `score_${value}`,
  value,
  reasoning: 'Steady onshore breeze with a clean short-period swell.',
  factors: { wind: value, wave: value - 8, tide: value - 4, daylight: 100 },
  isPersonalized,
});

type SlotOver = Record<string, unknown>;

const makeSlots = (spotId: string, spotName: string, sport: string, rows: SlotOver[]) =>
  rows.map((row, i) => ({
    _id: `${spotId}_slot_${i}`,
    spotId,
    spotName,
    sport,
    isIdeal: false,
    isEpic: false,
    isContextual: false,
    isTideOnly: false,
    waveHeight: 0.8,
    wavePeriod: 6,
    waveDirection: 296,
    ...row,
  }));

const scheveningen = makeSlots(
  'spot_scheveningen_noord',
  'Scheveningen Noord',
  'wingfoil',
  [
    { timestamp: at(8), hour: '08:00', speed: 15.8, gust: 20.4, direction: 238, waveHeight: 0.6, wavePeriod: 5, score: score(58) },
    { timestamp: at(11), hour: '11:00', speed: 21.2, gust: 27.0, direction: 247, waveHeight: 0.9, wavePeriod: 6, isIdeal: true, score: score(79) },
    { timestamp: at(14), hour: '14:00', speed: 24.6, gust: 31.1, direction: 251, waveHeight: 1.2, wavePeriod: 7, isIdeal: true, isEpic: true, score: score(93) },
    { timestamp: at(17), hour: '17:00', speed: 18.4, gust: 23.3, direction: 268, waveHeight: 1.0, wavePeriod: 7, score: score(67) },
  ]
);

const zandvoort = makeSlots('spot_zandvoort', 'Zandvoort', 'wingfoil', [
  { timestamp: at(8), hour: '08:00', speed: 13.1, gust: 17.2, direction: 232, waveHeight: 0.5, wavePeriod: 5, score: score(49) },
  { timestamp: at(11), hour: '11:00', speed: 19.7, gust: 25.4, direction: 244, waveHeight: 0.8, wavePeriod: 6, isIdeal: true, score: score(74) },
  { timestamp: at(14), hour: '14:00', speed: 22.9, gust: 28.6, direction: 249, waveHeight: 1.1, wavePeriod: 7, isIdeal: true, score: score(81, true) },
  { timestamp: at(17), hour: '17:00', speed: 16.3, gust: 20.9, direction: 271, waveHeight: 0.9, wavePeriod: 6, score: score(55) },
]);

// showFilter="all" tints every slot scoring >= 60 that is NOT flagged ideal —
// so the "all" story needs slots without the isIdeal flag to show that tint.
const zandvoortUnflagged = zandvoort.map((slot) => ({ ...slot, isIdeal: false }));

const wijkAanZee = makeSlots('spot_wijk_aan_zee', 'Wijk aan Zee', 'surfing', [
  { timestamp: at(8), hour: '08:00', speed: 8.4, gust: 11.2, direction: 96, waveHeight: 1.4, wavePeriod: 9, waveDirection: 292, isIdeal: true, score: score(84) },
  { timestamp: at(11), hour: '11:00', speed: 10.1, gust: 13.5, direction: 112, waveHeight: 1.2, wavePeriod: 8, waveDirection: 288, score: score(69) },
  { timestamp: at(14), hour: '14:00', speed: 12.7, gust: 16.4, direction: 138, waveHeight: 0.9, wavePeriod: 7, waveDirection: 279, score: score(57) },
  { timestamp: at(17), hour: '17:00', speed: 14.9, gust: 19.1, direction: 154, waveHeight: 0.7, wavePeriod: 6, waveDirection: 271, score: score(44) },
]);

const spotsMap = {
  spot_scheveningen_noord: {
    _id: 'spot_scheveningen_noord',
    name: 'Scheveningen Noord',
    sports: ['wingfoil', 'kitesurfing'],
    url: 'https://www.windguru.cz/48557',
    liveReportUrl: 'https://www.windguru.cz/station/2329',
    webcamUrl: 'https://www.beachcam.nl/scheveningen',
    webcamStreamSource: 'iframe',
  },
  spot_zandvoort: {
    _id: 'spot_zandvoort',
    name: 'Zandvoort',
    sports: ['wingfoil'],
    url: 'https://www.windguru.cz/48558',
    liveReportUrl: 'https://www.windguru.cz/station/1483',
  },
  spot_wijk_aan_zee: {
    _id: 'spot_wijk_aan_zee',
    name: 'Wijk aan Zee',
    sports: ['surfing', 'wingfoil'],
    url: 'https://www.windguru.cz/48559',
    webcamUrl: 'https://www.beachcam.nl/wijk-aan-zee',
    webcamStreamSource: 'iframe',
  },
};

const tidesBySpot = {
  spot_wijk_aan_zee: {
    tides: [
      { type: 'high', time: at(9, 40), height: 1.9, timeStr: '09:40' },
      { type: 'low', time: at(15, 55), height: 0.3, timeStr: '15:55' },
    ],
  },
};

// The day header is `sticky md:top-[50px]` — in the app a 50px global nav sits
// above it. The preview card has no nav, so each story is offset by the same
// amount to keep the header from riding over the first spot name.
const Report = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-newsprint" style={{ paddingTop: 32 }}>{children}</div>
);

export const SingleSpot = () => (
  <Report>
    <DaySection
      day="Wednesday, May 15"
      slots={[]}
      spotsData={{ spot_scheveningen_noord: scheveningen }}
      selectedSports={['wingfoil']}
      spotsMap={spotsMap}
      isAuthenticated
    />
  </Report>
);

export const MultipleSpots = () => (
  <Report>
    <DaySection
      day="Wednesday, May 15"
      slots={[]}
      spotsData={{
        spot_scheveningen_noord: scheveningen,
        spot_zandvoort: zandvoort,
      }}
      selectedSports={['wingfoil']}
      spotsMap={spotsMap}
      isAuthenticated
    />
  </Report>
);

export const SurfingWithTides = () => (
  <Report>
    <DaySection
      day="Wednesday, May 15"
      slots={[]}
      spotsData={{ spot_wijk_aan_zee: wijkAanZee }}
      selectedSports={['surfing']}
      spotsMap={spotsMap}
      tidesBySpot={tidesBySpot}
      isAuthenticated
    />
  </Report>
);

export const ShowAllFilter = () => (
  <Report>
    <DaySection
      day="Wednesday, May 15"
      slots={[]}
      spotsData={{ spot_zandvoort: zandvoortUnflagged }}
      selectedSports={['wingfoil']}
      spotsMap={spotsMap}
      showFilter="all"
      isAuthenticated
    />
  </Report>
);

export const HighlightedFromDeepLink = () => (
  <Report>
    <DaySection
      id="day-2024-05-15"
      day="Wednesday, May 15"
      slots={scheveningen}
      spotsData={{}}
      selectedSports={['wingfoil']}
      spotsMap={spotsMap}
      isHighlighted
      isAuthenticated
    />
  </Report>
);
