import { WeekStrip } from 'waterman';

// Six days, readable without parsing a number. Bands are shaded by score
// (good → great → epic) so a row reads as a ranking, not as flat blocks.
//
// `dayStart` MUST be local midnight: the axis is derived from
// `slot.timestamp - day.dayStart`, so anchoring a day at its first slot
// collapses the axis by six hours.
const HOUR = 3600_000;
const DAY = 24 * HOUR;
const T0 = Date.UTC(2026, 6, 13, 23, 0); // Tuesday 00:00 in Lisbon (UTC+1)

const slot = (dayStart: number, hour: number, score: number, over = {}) => ({
  timestamp: dayStart + hour * HOUR,
  score,
  speed: 18,
  gust: 24,
  direction: 160,
  waveHeight: 1.2,
  wavePeriod: 9,
  waveDirection: 280,
  ...over,
});

const GOOD = 60;

const day = (i: number, label: string, scores: number[]) => {
  const dayStart = T0 + i * DAY;
  const slots = scores.map((s, j) => slot(dayStart, 6 + j * 3, s));
  // Contiguous runs at or above the good bar become one band.
  const windows: any[] = [];
  let run: any[] = [];
  const flush = () => {
    if (!run.length) return;
    const peak = run.reduce((b, s) => (s.score > b.score ? s : b), run[0]);
    windows.push({
      start: run[0].timestamp,
      end: run[run.length - 1].timestamp + 3 * HOUR,
      peak,
      score: peak.score,
      band: 'good',
      slots: run,
    });
    run = [];
  };
  for (const s of slots) (s.score >= GOOD ? run.push(s) : flush());
  flush();
  return {
    dayStart,
    label,
    windows,
    bestScore: windows.reduce((b, w) => (w.score > (b ?? -1) ? w.score : b), null as number | null),
    slots,
  };
};

const WEEK = [
  day(0, 'TUE', [41, 58, 88, 92, 84]),
  day(1, 'WED', [52, 74, 71, 55, 38]),
  day(2, 'THU', [22, 31, 44, 39, 28]),
  day(3, 'FRI', [48, 62, 79, 95, 91]),
  day(4, 'SAT', [55, 63, 58, 44, 33]),
  day(5, 'SUN', [37, 51, 78, 81, 69]),
];

export const TheWeek = () => <WeekStrip days={WEEK} sport="wingfoil" />;

// An empty day is drawn, not dropped — "nothing here" is an answer, and a
// missing row would read as missing data.
export const NothingOn = () => (
  <WeekStrip
    days={WEEK.map((d) => ({ ...d, windows: [], bestScore: null }))}
    sport="wingfoil"
    title="A flat week"
  />
);
