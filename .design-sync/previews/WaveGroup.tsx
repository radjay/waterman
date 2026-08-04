import { WaveGroup } from 'waterman';

export const SwellRange = () => (
  <div className="flex flex-col gap-3 font-data text-[0.95rem] text-ink">
    <WaveGroup waveHeight={0.4} wavePeriod={4} waveDirection={310} />
    <WaveGroup waveHeight={0.8} wavePeriod={6} waveDirection={285} />
    <WaveGroup waveHeight={1.4} wavePeriod={8} waveDirection={250} />
    <WaveGroup waveHeight={2.3} wavePeriod={11} waveDirection={205} />
  </div>
);

export const DirectionSweep = () => (
  <div className="flex flex-col gap-3 font-data text-[0.95rem] text-ink">
    <WaveGroup waveHeight={1.1} wavePeriod={7} waveDirection={20} />
    <WaveGroup waveHeight={1.1} wavePeriod={7} waveDirection={110} />
    <WaveGroup waveHeight={1.1} wavePeriod={7} waveDirection={200} />
    <WaveGroup waveHeight={1.1} wavePeriod={7} waveDirection={290} />
  </div>
);

export const MissingReadings = () => (
  <div className="flex flex-col gap-3 font-data text-[0.95rem] text-ink">
    <WaveGroup waveHeight={0.9} wavePeriod={5} waveDirection={undefined} />
    <WaveGroup waveHeight={0.9} wavePeriod={undefined} waveDirection={296} />
    <WaveGroup waveHeight={undefined} wavePeriod={undefined} waveDirection={undefined} />
  </div>
);

export const InForecastTable = () => (
  <div className="flex flex-col border-t border-ink/20 font-data text-[0.95rem] text-ink" style={{ maxWidth: 420 }}>
    {[
      { hour: '08:00', waveHeight: 0.6, wavePeriod: 5, waveDirection: 310 },
      { hour: '11:00', waveHeight: 0.9, wavePeriod: 6, waveDirection: 296 },
      { hour: '14:00', waveHeight: 1.3, wavePeriod: 8, waveDirection: 268 },
      { hour: '17:00', waveHeight: 1.7, wavePeriod: 9, waveDirection: 241 },
    ].map((row) => (
      <div key={row.hour} className="flex items-center gap-6 py-3 px-2 border-b border-ink/20">
        <span className="font-bold" style={{ width: 56 }}>{row.hour}</span>
        <WaveGroup
          waveHeight={row.waveHeight}
          wavePeriod={row.wavePeriod}
          waveDirection={row.waveDirection}
        />
      </div>
    ))}
  </div>
);
