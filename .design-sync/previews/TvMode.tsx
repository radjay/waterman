import { TvMode } from 'waterman';

const noop = () => {};

// TvMode is a `fixed inset-0` black takeover — it needs a stage with real height,
// otherwise it collapses onto a zero-height card root. Streams do not resolve in
// a preview, so each tile shows its empty 16:9 frame with the real gradient
// name plate; the grid, gutterless packing and exit affordance are live.
const Stage = ({ height, children }: { height: number; children: React.ReactNode }) => (
  <div style={{ minHeight: height, width: '100%' }}>{children}</div>
);

const cam = (name: string, town: string) => ({
  _id: `cam_${name.toLowerCase().replace(/[^a-z]+/g, '_')}`,
  name,
  town,
  webcamUrl: '',
});

export const CamWall = () => (
  <Stage height={620}>
    <TvMode
      onClose={noop}
      webcams={[
        cam('Scheveningen Noord', 'Den Haag'),
        cam('Zandvoort', 'Zandvoort aan Zee'),
        cam('Wijk aan Zee', 'Beverwijk'),
        cam('Ijmuiden', 'Velsen'),
        cam('Brouwersdam', 'Ouddorp'),
        cam('Domburg', 'Veere'),
      ]}
    />
  </Stage>
);

export const SingleRow = () => (
  <Stage height={340}>
    <TvMode
      onClose={noop}
      webcams={[
        cam('Scheveningen Noord', 'Den Haag'),
        cam('Wijk aan Zee', 'Beverwijk'),
        cam('Brouwersdam', 'Ouddorp'),
      ]}
    />
  </Stage>
);

export const NineUp = () => (
  <Stage height={640}>
    <TvMode
      onClose={noop}
      webcams={[
        cam('Scheveningen Noord', 'Den Haag'),
        cam('Scheveningen Zuid', 'Den Haag'),
        cam('Zandvoort', 'Zandvoort aan Zee'),
        cam('Wijk aan Zee', 'Beverwijk'),
        cam('Ijmuiden', 'Velsen'),
        cam('Bloemendaal', 'Bloemendaal aan Zee'),
        cam('Brouwersdam', 'Ouddorp'),
        cam('Domburg', 'Veere'),
        cam('Hoek van Holland', 'Rotterdam'),
      ]}
    />
  </Stage>
);
