import { ShareButton, Heading, Text, Card, ScoreDial } from 'waterman';

export const Default = () => (
  <ShareButton url="https://waterman.app/report/scheveningen-noord" title="Scheveningen Noord — 19 kt NW" />
);

export const InSpotHeader = () => (
  <div className="w-full max-w-xl flex items-start justify-between gap-4 border-b border-ink/15 pb-4">
    <div className="flex flex-col gap-1">
      <Heading level={2}>Scheveningen Noord</Heading>
      <Text variant="muted">19 kt NW gusting 26 kt · 0.8 m · water 17°C</Text>
    </div>
    <div className="flex items-center gap-3">
      <ScoreDial score={87} sport="wingfoil" size="md" />
      <ShareButton url="https://waterman.app/report/scheveningen-noord" title="Scheveningen Noord" />
    </div>
  </div>
);

export const OnCard = () => (
  <div className="max-w-sm">
    <Card variant="elevated">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Text variant="label">Brouwersdam</Text>
          <Text variant="caption">Saturday 07:00 – 09:15 · 2h 15m</Text>
        </div>
        <ShareButton url="https://waterman.app/report/brouwersdam" title="Brouwersdam session" />
      </div>
    </Card>
  </div>
);
