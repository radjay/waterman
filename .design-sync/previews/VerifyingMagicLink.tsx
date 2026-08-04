import { VerifyingMagicLink, Card, Heading, Text } from 'waterman';

// Default copy — the state /auth/verify shows while the token round-trips.
export const Default = () => (
  <div className="w-full max-w-md">
    <Card variant="elevated" className="bg-white p-8">
      <VerifyingMagicLink />
    </Card>
  </div>
);

// The only prop is `message`, so that is the variant axis.
export const Messages = () => (
  <div className="flex flex-col gap-4 w-full max-w-md">
    <Card variant="elevated" className="bg-white p-6">
      <VerifyingMagicLink message="Signing you in as jeroen@example.com…" />
    </Card>
    <Card variant="elevated" className="bg-white p-6">
      <VerifyingMagicLink message="Restoring your spots and journal…" />
    </Card>
  </div>
);

// Full-page framing, as /auth/verify renders it inside the Suspense fallback.
export const VerifyPage = () => (
  <div className="w-full max-w-md">
    <div className="text-center mb-6">
      <Heading level={1} className="text-4xl mb-2">Waterman</Heading>
      <Text variant="muted" className="text-sm">Scheveningen Noord · 19 kt NW</Text>
    </div>
    <Card variant="elevated" className="bg-white p-8">
      <VerifyingMagicLink />
    </Card>
  </div>
);
