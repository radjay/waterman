import { Modal, Heading, Text, Button, Divider, ScoreDial } from 'waterman';

const noop = () => {};

// Modal renders a `fixed inset-0` overlay, so it needs a stage with real height
// to centre itself in — otherwise it collapses onto a zero-height root.
const Stage = ({ height, children }: { height: number; children: React.ReactNode }) => (
  <div style={{ minHeight: height, width: '100%' }}>{children}</div>
);

export const Default = () => (
  <Stage height={440}>
    <Modal isOpen onClose={noop} size="md">
      <div className="p-6 flex flex-col gap-4">
        <Heading level={2}>Scheveningen Noord</Heading>
        <Text variant="muted">
          Saturday 06:40 – 09:00 · 19 kt NW gusting 26 kt · 0.8 m swell · water 17°C
        </Text>
        <Divider weight="light" />
        <Text variant="body">
          Cross-shore wind over an incoming tide. The sandbar covers around 07:20, which
          cleans up the inside chop for the rest of the window.
        </Text>
        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm">Add to journal</Button>
          <Button variant="ghost" size="sm">Dismiss</Button>
        </div>
      </div>
    </Modal>
  </Stage>
);

export const Small = () => (
  <Stage height={300}>
    <Modal isOpen onClose={noop} size="sm">
      <div className="p-6 flex flex-col gap-2">
        <Heading level={3}>Delete this session?</Heading>
        <Text variant="muted">2h 15m at Brouwersdam on 14 May will be removed.</Text>
        <div className="flex items-center gap-3 pt-2">
          <Button variant="danger" size="sm">Delete</Button>
          <Button variant="ghost" size="sm">Cancel</Button>
        </div>
      </div>
    </Modal>
  </Stage>
);

export const ScoreBreakdown = () => (
  <Stage height={520}>
    <Modal isOpen onClose={noop} size="lg">
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Heading level={2}>Why 87?</Heading>
            <Text variant="caption">Wijk aan Zee · wingfoil · Saturday 07:00</Text>
          </div>
          <ScoreDial score={87} sport="wingfoil" size="lg" />
        </div>
        <Divider weight="light" />
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Text variant="body">Wind speed</Text>
            <Text variant="muted">24 kt WSW</Text>
          </div>
          <div className="flex items-center justify-between">
            <Text variant="body">Gust factor</Text>
            <Text variant="muted">1.15</Text>
          </div>
          <div className="flex items-center justify-between">
            <Text variant="body">Wave height</Text>
            <Text variant="muted">0.8 m @ 6 s</Text>
          </div>
          <div className="flex items-center justify-between">
            <Text variant="body">Tide</Text>
            <Text variant="muted">High 06:40 · Low 12:55</Text>
          </div>
        </div>
      </div>
    </Modal>
  </Stage>
);
