import { WindGroup } from 'waterman';

export const WithGusts = () => (
  <div className="flex flex-col gap-3 font-data text-[0.95rem] text-ink">
    <WindGroup speed={12.4} gust={16.1} direction={42} />
    <WindGroup speed={19.2} gust={24.8} direction={315} />
    <WindGroup speed={24.6} gust={31.3} direction={247} />
    <WindGroup speed={31.7} gust={41.2} direction={202} />
  </div>
);

export const WithoutGusts = () => (
  <div className="flex flex-col gap-3 font-data text-[0.95rem] text-ink">
    <WindGroup speed={8.3} gust={11.9} direction={90} showGust={false} />
    <WindGroup speed={16.5} gust={22.4} direction={225} showGust={false} />
    <WindGroup speed={27.1} gust={35.0} direction={270} showGust={false} />
  </div>
);

export const MissingReadings = () => (
  <div className="flex flex-col gap-3 font-data text-[0.95rem] text-ink">
    <WindGroup speed={18.6} gust={undefined} direction={247} />
    <WindGroup speed={undefined} gust={undefined} direction={247} />
    <WindGroup speed={18.6} gust={23.4} direction={null} />
  </div>
);

export const InForecastTable = () => (
  <div className="flex flex-col border-t border-ink/20 font-data text-[0.95rem] text-ink" style={{ maxWidth: 420 }}>
    {[
      { hour: '08:00', speed: 14.2, gust: 18.7, direction: 42 },
      { hour: '11:00', speed: 19.8, gust: 25.1, direction: 315 },
      { hour: '14:00', speed: 24.3, gust: 30.9, direction: 247 },
      { hour: '17:00', speed: 21.0, gust: 27.6, direction: 292 },
    ].map((row) => (
      <div key={row.hour} className="flex items-center gap-6 py-3 px-2 border-b border-ink/20">
        <span className="font-bold" style={{ width: 56 }}>{row.hour}</span>
        <WindGroup speed={row.speed} gust={row.gust} direction={row.direction} />
      </div>
    ))}
  </div>
);
