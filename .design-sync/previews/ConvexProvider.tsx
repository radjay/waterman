import { ConvexProvider, AuthProvider, EmailLoginForm, Heading, Text, Card } from 'waterman';

const noop = () => {};

// ConvexProvider hands the shared ConvexReactClient to the tree. It renders no
// chrome of its own, so the honest story is the provider around a child that
// actually needs it — EmailLoginForm calls useMutation(api.auth.requestMagicLink)
// and would throw outside this provider.
export const AroundAConsumer = () => (
  <ConvexProvider>
    <div className="w-full max-w-md">
      <Card variant="elevated" className="bg-white p-8">
        <div className="mb-6">
          <Heading level={2} className="text-2xl mb-1">Sign in</Heading>
          <Text variant="muted" className="text-sm">
            useMutation / useQuery below this point talk to Convex.
          </Text>
        </div>
        <EmailLoginForm onSuccess={noop} />
      </Card>
    </div>
  </ConvexProvider>
);

// The root nesting from app/layout.js: ConvexProvider → AuthProvider → app.
export const AppRoot = () => (
  <ConvexProvider>
    <AuthProvider>
      <div className="w-full max-w-md text-center">
        <Heading level={1} className="text-4xl mb-2">Waterman</Heading>
        <Text variant="muted" className="text-sm mb-8">
          Wingfoil &amp; surf conditions for the Dutch coast
        </Text>
        <EmailLoginForm onSuccess={noop} />
      </div>
    </AuthProvider>
  </ConvexProvider>
);
