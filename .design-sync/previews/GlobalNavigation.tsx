import { GlobalNavigation, Section, Card, Text, Heading, ScoreDial, Divider } from 'waterman';

// GlobalNavigation pins its auth control with `fixed top-4 right-4`. A fixed
// child resolves against the nearest transformed ancestor, and the card root
// has no height of its own — so every story supplies a page-sized stage that
// owns the fixed positioning (`transform` + explicit height).
const PageStage = ({ height, children }: { height: number; children: React.ReactNode }) => (
  <div
    className="bg-newsprint border border-ink/10 rounded-card overflow-hidden"
    style={{ width: '100%', maxWidth: 820, height, position: 'relative', transform: 'translateZ(0)' }}
  >
    {children}
  </div>
);

// No session token exists in the preview environment, so AuthProvider settles
// as signed out — the Sign In control is the reachable state.
export const SignedOut = () => (
  <PageStage height={420}>
    <GlobalNavigation />
    <div className="px-8 pt-6">
      <Heading level={1}>The Waterman Report</Heading>
      <div className="pt-4">
        <Divider weight="light" />
      </div>
      <Section title="Saturday 18 May">
        <div className="flex flex-col gap-3">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <Text variant="label">Scheveningen Noord</Text>
                <Text variant="caption">07:00 – 09:15 · 19 kt NW gusting 26 kt · 0.8 m</Text>
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
    </div>
  </PageStage>
);

export const OverForecastList = () => (
  <PageStage height={260}>
    <GlobalNavigation />
    <div className="px-8 pt-6 flex flex-col gap-2">
      <Heading level={3}>Sunday 19 May</Heading>
      <Text variant="muted">Ijmuiden · 21 kt SW gusting 28 kt · High 06:40 · Low 12:55</Text>
      <Text variant="muted">Zandvoort · 18 kt WNW · 0.9 m @ 6 s · water 17°C</Text>
      <Text variant="muted">Brouwersdam · 16 kt W · 0.6 m @ 5 s</Text>
    </div>
  </PageStage>
);
