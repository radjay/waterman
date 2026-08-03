import { MobileMenu, Card, Text, Heading, ScorePill } from 'waterman';

const noop = () => {};

// MobileMenu is a `fixed inset-0` backdrop plus a bottom sheet. Fixed children
// resolve against the nearest transformed ancestor and the card root has no
// height of its own, so each story supplies an explicit stage that owns the
// positioning.
const Stage = ({
  width,
  height,
  children,
}: {
  width: number | string;
  height: number;
  children: React.ReactNode;
}) => (
  <>
    {/* The backdrop fades in (opacity 0 -> 1, 200ms). A static capture can fire
        before that settles and photograph the sheet without its scrim, so the
        stage pins the backdrop to its resting value. */}
    <style>{`.ds-menu-stage .bg-black\\/40 { opacity: 1 !important; }`}</style>
    <div
      className="ds-menu-stage bg-newsprint border border-ink/15 rounded-card overflow-hidden"
      style={{ width, height, position: 'relative', transform: 'translateZ(0)' }}
    >
      {children}
    </div>
  </>
);

// No session token exists in the preview environment, so AuthProvider settles
// as signed out — the sheet shows its Sign In row rather than an account row.
export const Open = () => (
  <Stage width={390} height={620}>
    <div className="px-4 pt-4 flex flex-col gap-3">
      <Heading level={3}>Coming up</Heading>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Text variant="label">Scheveningen Noord</Text>
            <Text variant="caption">07:00 – 09:15 · 19 kt NW</Text>
          </div>
          <ScorePill score={87} sport="wingfoil" size="sm" />
        </div>
      </Card>
    </div>
    <MobileMenu isOpen onOpenChange={noop} />
  </Stage>
);

export const OverReportList = () => (
  <Stage width={620} height={600}>
    <div className="px-6 pt-5 flex flex-col gap-2">
      <Heading level={3}>Saturday 18 May</Heading>
      <Text variant="muted">Scheveningen Noord · 19 kt NW gusting 26 kt · 0.8 m @ 6 s</Text>
      <Text variant="muted">Wijk aan Zee · 24 kt WSW · 1.1 m @ 7 s</Text>
      <Text variant="muted">Ijmuiden · 21 kt SW · High 06:40 · Low 12:55</Text>
    </div>
    <MobileMenu isOpen onOpenChange={noop} />
  </Stage>
);
