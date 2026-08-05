import { CalendarView } from 'waterman';

const noop = () => {};

// CalendarView always renders the next 9 days and keys `grouped` with
// lib/utils `formatDate` ("Wed, May 15"), so the fixture keys are derived the
// same way from today.
const dayKey = (offset: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const spotsMap = {
  scheveningen: { name: 'Scheveningen Noord', sports: ['wingfoil', 'surfing'] },
  zandvoort: { name: 'Zandvoort', sports: ['wingfoil', 'kitesurfing'] },
  wijkaanzee: { name: 'Wijk aan Zee', sports: ['surfing'] },
  brouwersdam: { name: 'Brouwersdam', sports: ['wingfoil', 'kitesurfing'] },
  ijmuiden: { name: 'Ijmuiden', sports: ['wingfoil'] },
};

// `direction` is stored 180° from what the app displays (getDisplayWindDirection
// adds 180), so 45 renders SW, 90 renders W and 135 renders NW.
const wind = (sport: string, score: number, hour: string, speed: number, gust: number, direction: number) => ({
  sport,
  hour,
  score: { value: score },
  speed,
  gust,
  direction,
  waveHeight: 0.9,
  wavePeriod: 6,
  waveDirection: 135,
});

const surf = (score: number, hour: string, waveHeight: number, wavePeriod: number) => ({
  sport: 'surfing',
  hour,
  score: { value: score },
  waveHeight,
  wavePeriod,
  waveDirection: 120,
  speed: 8,
  gust: 11,
  direction: 45,
});

const sports = ['wingfoil', 'kitesurfing', 'surfing'];

export const NineDayOutlook = () => (
  <CalendarView
    grouped={{
      [dayKey(0)]: {
        scheveningen: [wind('wingfoil', 78, '09:00', 22, 27, 90)],
        wijkaanzee: [surf(64, '07:00', 1.1, 8)],
      },
      [dayKey(1)]: {
        brouwersdam: [wind('kitesurfing', 91, '11:00', 25, 31, 45)],
        zandvoort: [wind('wingfoil', 72, '14:00', 19, 24, 135)],
      },
      [dayKey(3)]: {
        ijmuiden: [wind('wingfoil', 66, '10:00', 17, 22, 90)],
      },
      [dayKey(4)]: {
        scheveningen: [surf(81, '06:00', 1.6, 10)],
        zandvoort: [wind('kitesurfing', 69, '13:00', 18, 25, 45)],
      },
      [dayKey(6)]: {
        brouwersdam: [wind('wingfoil', 74, '12:00', 21, 26, 90)],
      },
      [dayKey(7)]: {
        scheveningen: [wind('wingfoil', 63, '15:00', 16, 21, 135)],
        wijkaanzee: [surf(71, '08:00', 1.3, 9)],
      },
    }}
    sortedDays={[dayKey(0), dayKey(1), dayKey(3), dayKey(4), dayKey(6), dayKey(7)]}
    spotsMap={spotsMap}
    selectedSports={sports}
    onDayClick={noop}
    onSpotClick={noop}
  />
);

export const SwellWindow = () => (
  <CalendarView
    grouped={{
      [dayKey(1)]: {
        wijkaanzee: [surf(83, '07:30', 1.8, 11)],
        scheveningen: [surf(76, '08:00', 1.5, 10)],
      },
      [dayKey(2)]: {
        wijkaanzee: [surf(94, '06:45', 2.1, 12)],
        scheveningen: [surf(88, '07:15', 1.9, 11)],
      },
      [dayKey(3)]: {
        wijkaanzee: [surf(69, '09:00', 1.2, 9)],
      },
      [dayKey(5)]: {
        scheveningen: [wind('wingfoil', 67, '13:00', 18, 23, 90)],
      },
    }}
    sortedDays={[dayKey(1), dayKey(2), dayKey(3), dayKey(5)]}
    spotsMap={spotsMap}
    selectedSports={sports}
    onDayClick={noop}
    onSpotClick={noop}
  />
);

export const QuietSpell = () => (
  <CalendarView
    grouped={{
      [dayKey(5)]: {
        brouwersdam: [wind('wingfoil', 62, '14:00', 16, 20, 45)],
      },
    }}
    sortedDays={[dayKey(5)]}
    spotsMap={spotsMap}
    selectedSports={sports}
    onDayClick={noop}
    onSpotClick={noop}
  />
);
