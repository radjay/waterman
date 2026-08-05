import { WebcamModal } from 'waterman';

const noop = () => {};

// WebcamModal is a `fixed inset-0` lightbox — it needs a stage with real height,
// otherwise it collapses onto a zero-height card root. No live cam resolves in a
// preview, so these stories show the real chrome: close affordance, spot-name
// plate, and the unreachable-feed message the app shows when a cam is down.
const Stage = ({ height, children }: { height: number; children: React.ReactNode }) => (
  <div style={{ minHeight: height, width: '100%' }}>{children}</div>
);

export const StillImageUnavailable = () => (
  <Stage height={520}>
    <WebcamModal
      isOpen
      onClose={noop}
      spotName="Scheveningen Noord"
      webcamUrl="https://cams.scheveningen.invalid/noord/current.jpg"
      webcamStreamSource="image"
    />
  </Stage>
);

export const LiveStream = () => (
  <Stage height={520}>
    <WebcamModal
      isOpen
      onClose={noop}
      spotName="Brouwersdam · Kabbelaarsbank"
      webcamUrl="https://deliverys5.quanteec.invalid/contents/encodings/live/brouwersdam/media_0.m3u8"
      webcamStreamSource="quanteec"
    />
  </Stage>
);

export const Compact = () => (
  <Stage height={340}>
    <WebcamModal
      isOpen
      onClose={noop}
      spotName="Wijk aan Zee"
      webcamUrl="https://cams.wijkaanzee.invalid/pier/snapshot.jpg"
      webcamStreamSource="image"
    />
  </Stage>
);
