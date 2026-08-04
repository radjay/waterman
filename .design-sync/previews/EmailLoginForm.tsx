import { EmailLoginForm, Heading, Text, Card } from 'waterman';

const noop = () => {};

// EmailLoginForm is the first step of the magic-link flow: one email field plus
// a full-width ink submit button. It owns its own state, so it always captures
// empty (placeholder) — that is the state a signed-out visitor first sees.
export const Default = () => (
  <div className="w-full max-w-md">
    <EmailLoginForm onSuccess={noop} />
  </div>
);

// How app/auth/login composes it: centred masthead, muted subtitle, then the form.
export const LoginPanel = () => (
  <div className="w-full max-w-md">
    <div className="text-center mb-8">
      <Heading level={1} className="text-4xl mb-2">Waterman</Heading>
      <Text variant="muted" className="text-sm">
        Sign in to personalize your experience
      </Text>
    </div>
    <EmailLoginForm onSuccess={noop} />
  </div>
);

// On a white card, the way the verify/onboarding surfaces frame auth content.
export const OnCard = () => (
  <div className="w-full max-w-md">
    <Card variant="elevated" className="bg-white p-8">
      <div className="mb-6">
        <Heading level={2} className="text-2xl mb-1">Save your sessions</Heading>
        <Text variant="muted" className="text-sm">
          We&apos;ll email a sign-in link — no password to remember.
        </Text>
      </div>
      <EmailLoginForm onSuccess={noop} />
    </Card>
  </div>
);
