import { WebcamFullscreen } from 'waterman';

const noop = () => {};

// WebcamFullscreen is a `fixed inset-0` takeover — it needs a stage with real
// height, otherwise it collapses onto a zero-height card root. It pulls its own
// conditions from Convex and its own HLS stream, neither of which resolves in a
// preview, so the stories show the real letterboxed player chrome, the exit
// affordance and the spot plate with the honest "no condition data" fallback.
const Stage = ({ height, children }: { height: number; children: React.ReactNode }) => (
  <div style={{ minHeight: height, width: '100%' }}>{children}</div>
);

const cam = (name: string, town: string) => ({
  _id: `cam_${name.toLowerCase().replace(/[^a-z]+/g, '_')}`,
  name,
  town,
  webcamOnly: false,
  latitude: 52.109,
  longitude: 4.273,
  webcamUrl: '',
});

export const Default = () => (
  <Stage height={620}>
    <WebcamFullscreen spot={cam('Scheveningen Noord', 'Den Haag')} onClose={noop} />
  </Stage>
);

export const WithNavigation = () => (
  <Stage height={620}>
    <WebcamFullscreen
      spot={cam('Brouwersdam', 'Ouddorp')}
      onClose={noop}
      onNavigate={noop}
      allWebcams={[
        cam('Scheveningen Noord', 'Den Haag'),
        cam('Brouwersdam', 'Ouddorp'),
        cam('Wijk aan Zee', 'Beverwijk'),
      ]}
    />
  </Stage>
);
