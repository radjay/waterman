import { MainLayout, Section, Card, Text, Heading, ScoreDial, Divider, Button } from 'waterman';

// MainLayout is the page shell: a max-w-[900px] newsprint column with rules on
// both edges and `min-h-screen`, plus the mobile BottomNav. It is only
// meaningful with a page inside it, so every story fills it with real content.

export const ReportPage = () => (
  <MainLayout>
    <div className="flex flex-col gap-1 pb-2">
      <Heading level={1}>The Waterman Report</Heading>
      <Text variant="caption">Saturday 18 May · Dutch coast</Text>
    </div>
    <Divider weight="medium" />
    <Section title="Coming up" action={<Button variant="ghost" size="sm">See all</Button>}>
      <div className="flex flex-col gap-3">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Text variant="label">Scheveningen Noord</Text>
              <Text variant="caption">07:00 – 09:15 · 19 kt NW gusting 26 kt · 0.8 m @ 6 s</Text>
            </div>
            <ScoreDial score={87} sport="wingfoil" size="md" />
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Text variant="label">Wijk aan Zee</Text>
              <Text variant="caption">11:00 – 13:30 · 24 kt WSW · 1.1 m @ 7 s</Text>
            </div>
            <ScoreDial score={72} sport="kitesurfing" size="md" />
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Text variant="label">Brouwersdam</Text>
              <Text variant="caption">Sunday 06:40 – 08:20 · 16 kt W · 0.6 m @ 5 s</Text>
            </div>
            <ScoreDial score={64} sport="surfing" size="md" />
          </div>
        </Card>
      </div>
    </Section>
    <Section title="Tide" divided>
      <Text variant="muted">High 06:40 · Low 12:55 · High 19:10 · water 17°C</Text>
    </Section>
  </MainLayout>
);

export const JournalPage = () => (
  <MainLayout>
    <div className="flex flex-col gap-1 pb-2">
      <Heading level={2}>Session journal</Heading>
      <Text variant="caption">14 sessions logged this season</Text>
    </div>
    <Divider weight="light" />
    <Section title="May">
      <div className="flex flex-col gap-3">
        <Card variant="elevated">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Text variant="label">Brouwersdam · wingfoil</Text>
              <Text variant="caption">14 May · 2h 15m · 21 kt SW gusting 28 kt</Text>
            </div>
            <ScoreDial score={81} sport="wingfoil" size="md" />
          </div>
        </Card>
        <Card variant="elevated">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Text variant="label">Zandvoort · surfing</Text>
              <Text variant="caption">9 May · 1h 40m · 0.9 m @ 6 s · water 16°C</Text>
            </div>
            <ScoreDial score={68} sport="surfing" size="md" />
          </div>
        </Card>
      </div>
    </Section>
  </MainLayout>
);
