import { Card, Heading, Text, ScoreDial } from 'waterman';

export const Variants = () => (
  <div className="flex flex-col gap-4 max-w-md">
    <Card variant="default">
      <Text variant="label">Default</Text>
      <Text variant="body">A plain container for grouped content.</Text>
    </Card>
    <Card variant="interactive" onClick={() => {}}>
      <Text variant="label">Interactive</Text>
      <Text variant="body">Renders as a button and lifts on hover.</Text>
    </Card>
    <Card variant="elevated">
      <Text variant="label">Elevated</Text>
      <Text variant="body">Raised above the page for emphasis.</Text>
    </Card>
  </div>
);

export const SpotCard = () => (
  <div className="max-w-md">
    <Card variant="interactive" onClick={() => {}}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Heading level={3}>Scheveningen Noord</Heading>
          <Text variant="muted">19 kt NW · 0.8 m swell · incoming tide</Text>
          <Text variant="caption">Updated 06:12</Text>
        </div>
        <ScoreDial score={87} sport="wingfoil" size="lg" />
      </div>
    </Card>
  </div>
);

export const Compact = () => (
  <div className="max-w-xs">
    <Card>
      <Text variant="label">Water temperature</Text>
      <Text variant="body">17°C</Text>
    </Card>
  </div>
);
