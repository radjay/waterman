import { ModelGrid } from 'waterman';

// The centrepiece of the window screen: when each model says go. Agreement
// reads as a vertical stripe, so a rider who has never heard of ICON-EU can
// still see that everything lines up at 15:00 and one model is alone.
//
// Wind sports only — windy.app serves wave data from separate models and it is
// identical across all five wind models, so for surf this would be five
// identical rows claiming a consensus nobody measured. CriteriaPanel is the
// surf answer.
const HOUR = 3600_000;
const base = Date.UTC(2026, 6, 14, 11, 0);

const COLUMNS = [
  { timestamp: base, label: '12:00' },
  { timestamp: base + 3 * HOUR, label: '15:00' },
  { timestamp: base + 6 * HOUR, label: '18:00' },
];

export const FourOfFive = () => (
  <div className="max-w-md">
    <ModelGrid
      columns={COLUMNS}
      agreedByColumn={[4, 5, 3]}
      sourceModel="gfs27_long"
      outlier="iconeuro"
      sentence="Four of five models back this window; ICON-EU is alone in calling it light."
      models={[
        { model: 'gfs27_long', votes: [true, true, true] },
        { model: 'ecmwf', votes: [true, true, 'near'] },
        { model: 'iconeuro', votes: [false, true, false] },
        { model: 'iconglobal', votes: ['near', true, true] },
        { model: 'lew', votes: [true, true, true] },
      ]}
    />
  </div>
);

// "Just under" is its own state. Collapsing it into "no" turned a two-knot
// spread into unanimous disagreement nobody had expressed.
export const ModelsSplit = () => (
  <div className="max-w-md">
    <ModelGrid
      columns={COLUMNS}
      agreedByColumn={[2, 2, 1]}
      sourceModel="gfs27_long"
      sentence="The models do not agree about this afternoon — treat it as a maybe."
      models={[
        { model: 'gfs27_long', votes: [true, 'near', false] },
        { model: 'ecmwf', votes: ['near', true, false] },
        { model: 'iconeuro', votes: [false, false, false] },
        { model: 'iconglobal', votes: [true, true, true] },
        { model: 'lew', votes: [false, 'near', 'near'] },
      ]}
    />
  </div>
);
