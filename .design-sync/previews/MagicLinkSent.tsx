import { MagicLinkSent, Heading, Text, Card } from 'waterman';

const noop = () => {};

// Step two of the magic-link flow: confirmation that the mail is on its way,
// with the "enter code instead" and "try again" escape hatches.
export const Default = () => (
  <div className="w-full max-w-md">
    <MagicLinkSent email="jeroen@example.com" onBack={noop} />
  </div>
);

// The address is echoed back verbatim, so long addresses are the case to check.
export const LongAddress = () => (
  <div className="w-full max-w-md">
    <MagicLinkSent email="jeroen.seghers@scheveningen-watersport.nl" onBack={noop} />
  </div>
);

// How app/auth/login frames it once EmailLoginForm reports success.
export const LoginPage = () => (
  <div className="w-full max-w-md">
    <div className="text-center mb-8">
      <Heading level={1} className="text-4xl mb-2">Waterman</Heading>
    </div>
    <MagicLinkSent email="jeroen@example.com" onBack={noop} />
  </div>
);

// On a white card — the surface used by the verify and onboarding routes.
export const OnCard = () => (
  <div className="w-full max-w-md">
    <Card variant="elevated" className="bg-white p-8">
      <MagicLinkSent email="anouk@example.com" onBack={noop} />
      <Text variant="caption" className="block text-center mt-6">
        Links expire after 15 minutes
      </Text>
    </Card>
  </div>
);
