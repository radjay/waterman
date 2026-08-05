import { OnboardingFooter, Heading, Text, ScoreDial, Divider } from 'waterman';

const noop = () => {};

// OnboardingFooter is a `fixed bottom-0` banner, so it pins to the bottom of
// the nearest transformed ancestor — the card root. Give that root real height
// with an explicit stage or the banner collapses out of the frame.
const Stage = ({ height, children }: { height: number; children?: React.ReactNode }) => (
  <div style={{ minHeight: height, width: '100%', position: 'relative' }}>{children}</div>
);

export const Default = () => (
  <Stage height={180}>
    <OnboardingFooter onDismiss={noop} />
  </Stage>
);

export const OverForecastPage = () => (
  <Stage height={440}>
    <div className="p-6 flex flex-col gap-4 max-w-[620px]">
      <Heading level={2}>Today on the Dutch coast</Heading>
      <Divider weight="light" />
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Text variant="body">Scheveningen Noord</Text>
          <Text variant="caption">09:00 · 22 kt W gusting 27 kt · 0.9 m @ 6 s</Text>
        </div>
        <ScoreDial score={78} sport="wingfoil" size="lg" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Text variant="body">Wijk aan Zee</Text>
          <Text variant="caption">07:00 · 1.4 m @ 9 s · water 17°C</Text>
        </div>
        <ScoreDial score={71} sport="surfing" size="lg" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Text variant="body">Brouwersdam</Text>
          <Text variant="caption">11:00 · 24 kt WSW gusting 30 kt · High 06:40</Text>
        </div>
        <ScoreDial score={91} sport="kitesurfing" size="lg" />
      </div>
    </div>
    <OnboardingFooter onDismiss={noop} />
  </Stage>
);
