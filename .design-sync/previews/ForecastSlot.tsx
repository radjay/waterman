import { ForecastSlot } from 'waterman';

// Capture clock is fixed to 2024-05-15 — keep fixtures on that day so the
// slots read as "today" the way they do in the live report.
const at = (hour: number) => Date.UTC(2024, 4, 15, hour, 0, 0);

const score = (value: number, isPersonalized = false) => ({
  _id: `score_${value}`,
  value,
  reasoning: 'Steady onshore breeze with a clean short-period swell.',
  factors: { wind: value, wave: value - 8, tide: value - 4, daylight: 100 },
  isPersonalized,
});

const slot = (over: Record<string, unknown>) => ({
  _id: `slot_${String(over.hour)}_${String(over.spotId ?? 'schev')}`,
  spotId: 'spot_scheveningen_noord',
  spotName: 'Scheveningen Noord',
  timestamp: at(11),
  hour: '11:00',
  speed: 19.4,
  gust: 24.8,
  direction: 247,
  waveHeight: 0.9,
  wavePeriod: 6,
  waveDirection: 296,
  sport: 'wingfoil',
  isIdeal: false,
  isEpic: false,
  isContextual: false,
  isTideOnly: false,
  score: score(72),
  ...over,
});

const Table = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col border-t border-ink/20 bg-newsprint">{children}</div>
);

export const IdealSlot = () => (
  <Table>
    <ForecastSlot
      slot={slot({
        hour: '14:00',
        timestamp: at(14),
        speed: 22.6,
        gust: 28.4,
        direction: 247,
        waveHeight: 1.1,
        wavePeriod: 7,
        waveDirection: 288,
        isIdeal: true,
        score: score(88),
      })}
      nearbyTide={null}
      spotName="Scheveningen Noord"
    />
  </Table>
);

export const ScoreRange = () => (
  <Table>
    <ForecastSlot
      slot={slot({
        hour: '08:00',
        timestamp: at(8),
        speed: 26.9,
        gust: 34.2,
        direction: 232,
        waveHeight: 1.6,
        wavePeriod: 9,
        waveDirection: 271,
        isIdeal: true,
        isEpic: true,
        score: score(94),
      })}
      nearbyTide={null}
      spotName="Scheveningen Noord"
    />
    <ForecastSlot
      slot={slot({
        hour: '11:00',
        timestamp: at(11),
        speed: 21.3,
        gust: 27.1,
        direction: 247,
        isIdeal: true,
        score: score(79),
      })}
      nearbyTide={null}
      spotName="Scheveningen Noord"
    />
    <ForecastSlot
      slot={slot({
        hour: '14:00',
        timestamp: at(14),
        speed: 17.5,
        gust: 21.9,
        direction: 268,
        waveHeight: 0.7,
        wavePeriod: 5,
        waveDirection: 302,
        score: score(64),
      })}
      nearbyTide={null}
      spotName="Scheveningen Noord"
    />
    <ForecastSlot
      slot={slot({
        hour: '17:00',
        timestamp: at(17),
        speed: 11.2,
        gust: 14.6,
        direction: 314,
        waveHeight: 0.4,
        wavePeriod: 4,
        waveDirection: 330,
        score: score(38),
      })}
      nearbyTide={null}
      spotName="Scheveningen Noord"
    />
  </Table>
);

export const ShowAllFilter = () => (
  <Table>
    <ForecastSlot
      slot={slot({
        hour: '11:00',
        timestamp: at(11),
        speed: 20.8,
        gust: 26.5,
        direction: 251,
        score: score(71),
      })}
      nearbyTide={null}
      showFilter="all"
      spotName="Zandvoort"
    />
    <ForecastSlot
      slot={slot({
        hour: '14:00',
        timestamp: at(14),
        speed: 23.4,
        gust: 29.8,
        direction: 244,
        waveHeight: 1.2,
        wavePeriod: 7,
        waveDirection: 284,
        isIdeal: true,
        score: score(86),
      })}
      nearbyTide={null}
      showFilter="all"
      spotName="Zandvoort"
    />
    <ForecastSlot
      slot={slot({
        hour: '17:00',
        timestamp: at(17),
        speed: 9.6,
        gust: 12.8,
        direction: 22,
        waveHeight: 0.3,
        wavePeriod: 4,
        waveDirection: 12,
        score: score(41),
      })}
      nearbyTide={null}
      showFilter="all"
      spotName="Zandvoort"
    />
  </Table>
);

export const SurfingWithTide = () => (
  <Table>
    <ForecastSlot
      isSurfing
      slot={slot({
        spotId: 'spot_wijk_aan_zee',
        spotName: 'Wijk aan Zee',
        hour: '08:00',
        timestamp: at(8),
        speed: 8.4,
        gust: 11.2,
        direction: 96,
        waveHeight: 1.4,
        wavePeriod: 9,
        waveDirection: 292,
        sport: 'surfing',
        isIdeal: true,
        score: score(83),
      })}
      nearbyTide={{ type: 'high', time: at(8) + 40 * 60 * 1000, height: 1.9, isExactTime: true }}
      spotName="Wijk aan Zee"
    />
    <ForecastSlot
      isSurfing
      slot={slot({
        spotId: 'spot_wijk_aan_zee',
        spotName: 'Wijk aan Zee',
        hour: '11:00',
        timestamp: at(11),
        speed: 10.1,
        gust: 13.5,
        direction: 112,
        waveHeight: 1.2,
        wavePeriod: 8,
        waveDirection: 288,
        sport: 'surfing',
        score: score(68),
      })}
      nearbyTide={{ isRising: false, isFalling: true, isExactTime: false }}
      spotName="Wijk aan Zee"
    />
    <ForecastSlot
      isSurfing
      slot={slot({
        spotId: 'spot_wijk_aan_zee',
        spotName: 'Wijk aan Zee',
        hour: '14:00',
        timestamp: at(14),
        speed: 12.7,
        gust: 16.4,
        direction: 138,
        waveHeight: 0.9,
        wavePeriod: 7,
        waveDirection: 279,
        sport: 'surfing',
        score: score(57),
      })}
      nearbyTide={{ type: 'low', time: at(14) + 55 * 60 * 1000, height: 0.3, isExactTime: true }}
      spotName="Wijk aan Zee"
    />
  </Table>
);

export const PersonalisedAndFaded = () => (
  <Table>
    <ForecastSlot
      slot={slot({
        hour: '11:00',
        timestamp: at(11),
        speed: 20.2,
        gust: 25.7,
        direction: 249,
        isIdeal: true,
        score: score(81, true),
      })}
      nearbyTide={null}
      spotName="Brouwersdam"
    />
    <ForecastSlot
      slot={slot({
        hour: '20:00',
        timestamp: at(17),
        speed: 18.9,
        gust: 23.1,
        direction: 262,
        waveHeight: 0.8,
        wavePeriod: 6,
        waveDirection: 291,
        isContextual: true,
        score: score(66),
      })}
      nearbyTide={null}
      spotName="Brouwersdam"
    />
  </Table>
);
