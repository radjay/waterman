import { Header, Section, Card, Text, Heading, ScoreDial, Divider } from 'waterman';

// Header pulls itself out of the page gutter with `-mx-4 md:-mx-8`, so it
// always sits inside a padded page column — the stage reproduces MainLayout's
// `md:p-8` container.
const PageColumn = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full max-w-[860px] bg-newsprint px-8 pt-2 pb-6 border border-ink/10 rounded-card overflow-hidden">
    {children}
  </div>
);

export const Default = () => (
  <PageColumn>
    <Header />
  </PageColumn>
);

export const OnTheReportPage = () => (
  <PageColumn>
    <Header />
    <Section title="Saturday 18 May" divided>
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
      </div>
    </Section>
  </PageColumn>
);

export const AboveTideSummary = () => (
  <PageColumn>
    <Header className="mb-2" />
    <div className="flex flex-col gap-3">
      <Heading level={3}>Brouwersdam</Heading>
      <Divider weight="light" />
      <Text variant="muted">High 06:40 · Low 12:55 · High 19:10 · water 17°C</Text>
      <Text variant="body">
        Cross-shore wind over an incoming tide. The sandbar covers around 07:20, which
        cleans up the inside chop for the rest of the window.
      </Text>
    </div>
  </PageColumn>
);
