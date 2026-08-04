import { WebcamCard } from 'waterman';

const noop = () => {};

// No HLS stream resolves inside a preview, so every spot here is authored
// without a stream URL: the card then renders its real "Cam offline" placeholder
// (camera glyph + Retry) inside the 16:9 frame, which is exactly what the app
// shows when a cam is down. The rest of the card — spot title, condition line,
// score pill, focus ring — is fully live.
const spot = (name: string, town: string) => ({
  _id: `spot_${name.toLowerCase().replace(/[^a-z]+/g, '_')}`,
  name,
  town,
  webcamUrl: '',
  sports: ['wingfoil', 'kitesurfing'],
});

// Stored degrees are 180° off what the app prints: 135 renders as NW, 67 as WSW.
const morning = Date.UTC(2024, 4, 18, 7, 0);

export const WithConditions = () => (
  <div className="w-full max-w-md">
    <WebcamCard
      spot={spot('Scheveningen Noord', 'Den Haag')}
      forecastData={{
        timestamp: morning,
        speed: 19,
        gust: 26,
        direction: 135,
        waveHeight: 0.8,
        wavePeriod: 6,
        sport: 'wingfoil',
        score: 87,
      }}
      onScoreClick={noop}
    />
  </div>
);

export const NameOnly = () => (
  <div className="w-full max-w-md">
    <WebcamCard spot={spot('Wijk aan Zee', 'Beverwijk')} />
  </div>
);

export const Focused = () => (
  <div className="w-full max-w-md">
    <WebcamCard
      spot={spot('Brouwersdam', 'Ouddorp')}
      isFocused
      forecastData={{
        timestamp: Date.UTC(2024, 4, 18, 14, 0),
        speed: 24,
        gust: 31,
        direction: 67,
        waveHeight: 0.5,
        wavePeriod: 5,
        sport: 'kitesurfing',
        score: 92,
      }}
      onScoreClick={noop}
    />
  </div>
);

export const CamWall = () => (
  <div className="grid w-full grid-cols-2 gap-4">
    <WebcamCard
      spot={spot('Scheveningen Noord', 'Den Haag')}
      forecastData={{
        timestamp: morning,
        speed: 19,
        gust: 26,
        direction: 135,
        waveHeight: 0.8,
        wavePeriod: 6,
        sport: 'wingfoil',
        score: 87,
      }}
      onScoreClick={noop}
    />
    <WebcamCard
      spot={spot('Zandvoort', 'Zandvoort aan Zee')}
      forecastData={{
        timestamp: morning,
        speed: 12,
        gust: 17,
        direction: 100,
        waveHeight: 0.6,
        wavePeriod: 5,
        sport: 'surfing',
        score: 71,
      }}
      onScoreClick={noop}
    />
    <WebcamCard spot={spot('Ijmuiden', 'Velsen')} />
    <WebcamCard
      spot={spot('Brouwersdam', 'Ouddorp')}
      isFavorite
      onToggleFavorite={noop}
      forecastData={{
        timestamp: Date.UTC(2024, 4, 18, 14, 0),
        speed: 24,
        gust: 31,
        direction: 67,
        waveHeight: 0.5,
        wavePeriod: 5,
        sport: 'kitesurfing',
        score: 92,
      }}
      onScoreClick={noop}
    />
  </div>
);
