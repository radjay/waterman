import { CriteriaPanel } from 'waterman';

// The surf variant of the model grid. With the grid hidden for surf, surfing
// needs its own answer to "do I believe it" — and surf has RICHER per-slot
// criteria than wind does: swell height, period, swell direction and optimal
// tide all come from the spot config. Wind's confidence comes from who agrees;
// surf's comes from how many conditions line up. Same question, different
// evidence, deliberately the same visual language.
export const EverythingLinesUp = () => (
  <div className="max-w-md">
    <CriteriaPanel
      criteria={[
        { label: 'SWELL', value: '1.6 m', met: true, range: '1.2–2.5 m' },
        { label: 'PERIOD', value: '12 s', met: true, range: '10 s+' },
        { label: 'SWELL DIR', value: 'WNW', met: true, range: 'W–NW' },
        { label: 'TIDE', value: 'Mid, rising', met: true, range: 'mid to high' },
      ]}
      windAgreement={{
        band: 'good',
        agreed: 4,
        total: 5,
        models: [
          { model: 'gfs27_long', vote: true },
          { model: 'ecmwf', vote: true },
          { model: 'iconeuro', vote: false },
          { model: 'iconglobal', vote: true },
          { model: 'lew', vote: true },
        ],
      }}
    />
  </div>
);

// `met: null` is "we have no reading", which is a different answer from "it
// does not match" — the track colour says so.
export const PartlyThere = () => (
  <div className="max-w-md">
    <CriteriaPanel
      criteria={[
        { label: 'SWELL', value: '0.6 m', met: false, range: '1.2–2.5 m' },
        { label: 'PERIOD', value: '7 s', met: false, range: '10 s+' },
        { label: 'SWELL DIR', value: 'SW', met: false, range: 'W–NW' },
        { label: 'TIDE', value: '—', met: null, range: 'mid to high' },
      ]}
    />
  </div>
);
