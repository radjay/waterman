import { StationWindChart } from 'waterman';

// The station sparkline under a reading: solid base wind, dotted gusts, and —
// when the model has an opinion — a stepped dashed forecast underneath so you
// can see where the station and the model disagree.
//
// Points are `{time, speed, gust, forecast}` with `time` in epoch ms. The
// component rolling-averages three readings and lands its x-axis ticks on
// Lisbon wall-clock hours, so a fixture must carry real timestamps: a bare
// list of speeds draws nothing.
const MIN = 60_000;
const START = Date.UTC(2026, 6, 14, 9, 0); // 10:00 in Lisbon

// A nortada morning: near-glass at ten, filling hard from noon, peaking around
// 26 kn mid-afternoon and easing off. The y-axis starts at zero, so a fixture
// that only wanders between 18 and 22 draws a flat line and teaches nothing
// about what the chart is for.
const SPEEDS = [
  7, 7.4, 8.1, 8.6, 9.4, 10.2, 11.3, 12.6, 14.1, 15.4, 16.8, 18.1, 19.4, 20.6,
  21.7, 22.6, 23.4, 24.1, 24.8, 25.4, 25.9, 26.3, 25.8, 25.1, 24.4, 23.6, 22.7,
  21.8, 20.9, 20.1, 19.2, 18.4, 17.5, 16.6, 15.8, 15.1,
];

const history = SPEEDS.map((speed, i) => ({
  time: START + i * 10 * MIN,
  speed,
  gust: Math.round(speed * 1.28 * 10) / 10,
}));

// The chart fills its container and is 92px tall; a station card is the real
// container, so the stage matches that width.
const Stage = ({ children }: { children: React.ReactNode }) => (
  <div className="max-w-md rounded-[15px] bg-surface border border-card px-[14px] py-[13px]">
    {children}
  </div>
);

export const LastSixHours = () => (
  <Stage>
    <StationWindChart history={history} />
  </Stage>
);

// Forecast painted on as a step per 3-hour slot, drawn under the live lines so
// the station stays the hero. The model called a flat 14 then 19 kn while the
// station ran well over both from noon — seeing that gap is the whole reason
// the two are drawn together.
export const AgainstForecast = () => (
  <Stage>
    <StationWindChart
      history={history.map((point, i) => ({
        ...point,
        forecast: i < 18 ? 14 : 19,
      }))}
    />
  </Stage>
);
