import { Toast, Heading, Text, Divider } from 'waterman';

const noop = () => {};

// Toast is `fixed top-4 right-4`, so it needs a stage with real height to pin
// itself against — a zero-height root would crop it entirely.
const Stage = ({ height, children }: { height: number; children?: React.ReactNode }) => (
  <div style={{ minHeight: height, width: '100%', position: 'relative' }}>{children}</div>
);

// duration={0} disables the auto-dismiss timer so the toast survives capture.

export const Success = () => (
  <Stage height={120}>
    <Toast
      type="success"
      duration={0}
      onClose={noop}
      message="Wingfoil thresholds saved for Scheveningen Noord"
    />
  </Stage>
);

export const ErrorState = () => (
  <Stage height={120}>
    <Toast
      type="error"
      duration={0}
      onClose={noop}
      message="Could not reach the forecast service"
    />
  </Stage>
);

export const LongMessage = () => (
  <Stage height={140}>
    <Toast
      type="error"
      duration={0}
      onClose={noop}
      message="Windguru station 48291 returned no data for the last 3 hours — live wind is stale for Wijk aan Zee."
    />
  </Stage>
);

export const OverAdminPanel = () => (
  <Stage height={260}>
    <div className="p-6 flex flex-col gap-3 max-w-[520px]">
      <Heading level={3}>Spot configuration</Heading>
      <Text variant="muted">Brouwersdam · Windguru station 48291</Text>
      <Divider weight="light" />
      <div className="flex items-center justify-between">
        <Text variant="body">Min wind speed</Text>
        <Text variant="muted">14 kt</Text>
      </div>
      <div className="flex items-center justify-between">
        <Text variant="body">Wind direction window</Text>
        <Text variant="muted">180° – 360°</Text>
      </div>
    </div>
    <Toast
      type="success"
      duration={0}
      onClose={noop}
      message="Configuration updated"
    />
  </Stage>
);
