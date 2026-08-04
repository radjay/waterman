import { OnboardingModal } from 'waterman';

const noop = () => {};

// OnboardingModal renders through Modal's `fixed inset-0` overlay, which
// resolves against the card root — give that root real height or the overlay
// collapses to a zero-height box and gets cropped.
const Stage = ({ height, children }: { height: number; children?: React.ReactNode }) => (
  <div style={{ minHeight: height, width: '100%' }}>{children}</div>
);

// Step 1 (sport selection) is the entry point; later steps are reached by
// interaction and by a Convex spots query, so they cannot render statically.

export const Default = () => (
  <Stage height={540}>
    <OnboardingModal onComplete={noop} onDismiss={noop} isDismissible />
  </Stage>
);

export const Required = () => (
  <Stage height={540}>
    <OnboardingModal onComplete={noop} onDismiss={noop} isDismissible={false} />
  </Stage>
);
