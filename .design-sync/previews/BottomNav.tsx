import { BottomNav, Section, Card, Text, Heading, ScorePill } from 'waterman';

// BottomNav is `md:hidden fixed bottom-0` — it is the mobile tab bar. Two
// things stop it appearing in a preview card and both are fixed here:
//  1. the card is photographed at a 900px viewport, where `md:hidden` applies,
//     so the bar is display:none — the stage re-shows its own <nav> child;
//  2. `position: fixed` resolves against the card root, which has no height of
//     its own, so the stage declares an explicit phone-sized containing block
//     (`transform` makes it the containing block for fixed descendants).
const PhoneStage = ({ height, children }: { height: number; children: React.ReactNode }) => (
  <>
    <style>{`.ds-phone-stage > nav { display: block !important; }`}</style>
    <div
      className="ds-phone-stage bg-newsprint border border-ink/15 rounded-card overflow-hidden"
      style={{ width: 390, height, position: 'relative', transform: 'translateZ(0)' }}
    >
      {children}
    </div>
  </>
);

export const Default = () => (
  <PhoneStage height={560}>
    <div className="px-4 pt-4">
      <Section title="Coming up">
        <div className="flex flex-col gap-3">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <Text variant="label">Scheveningen Noord</Text>
                <Text variant="caption">Saturday 07:00 – 09:15 · 19 kt NW</Text>
              </div>
              <ScorePill score={87} sport="wingfoil" size="sm" />
            </div>
          </Card>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <Text variant="label">Wijk aan Zee</Text>
                <Text variant="caption">Saturday 11:00 – 13:30 · 24 kt WSW</Text>
              </div>
              <ScorePill score={72} sport="kitesurfing" size="sm" />
            </div>
          </Card>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <Text variant="label">Brouwersdam</Text>
                <Text variant="caption">Sunday 06:40 – 08:20 · 0.8 m @ 6 s</Text>
              </div>
              <ScorePill score={64} sport="surfing" size="sm" />
            </div>
          </Card>
        </div>
      </Section>
    </div>
    <BottomNav />
  </PhoneStage>
);

export const OverScrolledContent = () => (
  <PhoneStage height={250}>
    <div className="px-4 pt-3 flex flex-col gap-2">
      <Heading level={3}>Sunday 19 May</Heading>
      <Text variant="muted">Ijmuiden · 21 kt SW · 1.1 m @ 7 s</Text>
      <Text variant="muted">Zandvoort · 18 kt WNW · 0.9 m @ 6 s</Text>
      <Text variant="muted">Brouwersdam · 16 kt W · 0.6 m @ 5 s</Text>
    </div>
    <BottomNav />
  </PhoneStage>
);
