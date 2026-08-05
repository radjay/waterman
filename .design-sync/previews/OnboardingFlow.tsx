import { OnboardingFlow, Card, Heading, Text } from 'waterman';

const noop = () => {};

// Four-step wizard. It starts on step 1 (welcome) and advances only on click,
// so a static story shows the welcome step with the 1-of-4 progress rail.
export const Welcome = () => (
  <div className="w-full max-w-md">
    <OnboardingFlow onComplete={noop} />
  </div>
);

// How app/auth/verify renders it after a first-time sign-in: on a white card.
export const OnCard = () => (
  <div className="w-full max-w-lg">
    <Card variant="elevated" className="bg-white p-8">
      <OnboardingFlow onComplete={noop} />
    </Card>
  </div>
);

// Full-page framing, centred under the masthead like the verify route.
export const VerifyPage = () => (
  <div className="w-full max-w-lg">
    <div className="text-center mb-6">
      <Heading level={1} className="text-4xl mb-1">Waterman</Heading>
      <Text variant="muted" className="text-sm">
        Wingfoil &amp; surf conditions for the Dutch coast
      </Text>
    </div>
    <Card variant="elevated" className="bg-white p-8">
      <OnboardingFlow onComplete={noop} />
    </Card>
  </div>
);
