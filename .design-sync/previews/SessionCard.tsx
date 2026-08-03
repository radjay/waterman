import { SessionCard } from 'waterman';

const scheveningen = {
  _id: 'j5k2n8q1r4t7v0w3x6y9z2a5',
  sport: 'wingfoil',
  spotName: 'Scheveningen Noord',
  sessionDate: '2026-08-01T14:20:00',
  durationMinutes: 135,
  rating: 5,
  hasForecastData: true,
  sessionNotes:
    'Solid 19 kt NW filling in with the sea breeze. 5m wing, 1100 front foil — clean shoulder-high runs on the outside bank all afternoon.',
};

const zandvoort = {
  _id: 'b8c1d4e7f0g3h6i9j2k5l8m1',
  sport: 'kitesurfing',
  spotName: 'Zandvoort',
  sessionDate: '2026-07-28T10:05:00',
  durationMinutes: 90,
  rating: 3,
  hasForecastData: false,
  sessionNotes: 'Gusty 24 kt WSW, 9m felt overpowered in the peaks. Water 17°C.',
};

const wijkAanZee = {
  _id: 'n4o7p0q3r6s9t2u5v8w1x4y7',
  sport: 'surfing',
  spotName: 'Wijk aan Zee',
  sessionDate: '2026-07-24T07:40:00',
  durationMinutes: 55,
  rating: 2,
  hasForecastData: true,
  sessionNotes: '0.8 m windswell, short period and closing out on the low tide push.',
};

export const Default = () => (
  <div className="max-w-xl">
    <SessionCard entry={scheveningen} />
  </div>
);

export const SportVariants = () => (
  <div className="flex flex-col gap-3 max-w-xl">
    <SessionCard entry={scheveningen} />
    <SessionCard entry={zandvoort} />
    <SessionCard entry={wijkAanZee} />
  </div>
);

export const WithoutNotes = () => (
  <div className="flex flex-col gap-3 max-w-xl">
    <SessionCard
      entry={{
        _id: 'c2d5e8f1g4h7i0j3k6l9m2n5',
        sport: 'wingfoil',
        spotName: 'Brouwersdam',
        sessionDate: '2026-07-19T16:00:00',
        durationMinutes: 105,
        rating: 4,
        hasForecastData: false,
      }}
    />
    <SessionCard
      entry={{
        _id: 'd6e9f2g5h8i1j4k7l0m3n6o9',
        sport: 'kitesurfing',
        customLocation: 'Grevelingenmeer — north shore',
        sessionDate: '2025-09-12T13:15:00',
        durationMinutes: 45,
        rating: 3,
        hasForecastData: false,
      }}
    />
  </div>
);

export const JournalFeed = () => (
  <div className="max-w-xl">
    <div className="font-headline text-xl text-ink mb-1">Recent sessions</div>
    <div className="font-body text-sm text-ink/50 mb-4">
      12 logged this season &middot; 21h 40m on the water
    </div>
    <div className="flex flex-col gap-3">
      <SessionCard entry={scheveningen} />
      <SessionCard entry={zandvoort} />
      <SessionCard entry={wijkAanZee} />
    </div>
  </div>
);
