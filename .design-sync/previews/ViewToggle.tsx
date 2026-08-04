import { ViewToggle, ShareButton, Text, Heading, Divider } from 'waterman';
import { LogIn } from 'lucide-react';

// ViewToggle is the desktop nav bar: five route tabs with a sliding pill on the
// active one, plus optional right-hand content. The active tab comes from the
// router — in the preview environment the path is "/", which the component maps
// to the Report tab.

export const Default = () => (
  <div className="w-full max-w-2xl">
    <ViewToggle />
  </div>
);

export const Compact = () => (
  <div className="w-full max-w-2xl flex flex-col gap-4">
    <div className="flex flex-col gap-1.5">
      <Text variant="caption">Resting</Text>
      <ViewToggle />
    </div>
    <div className="flex flex-col gap-1.5">
      <Text variant="caption">Compact — the scrolled header state</Text>
      <ViewToggle compact />
    </div>
  </div>
);

// The header renders the bar full-width with the share pill and the auth
// control docked to the right.
const SignInPill = () => (
  <button
    type="button"
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-newsprint ring-1 ring-inset ring-ink/15 shadow-sm text-ink text-xs font-semibold uppercase tracking-wider leading-none"
  >
    <LogIn className="w-[15px] h-[15px]" />
    <span>Sign In</span>
  </button>
);

export const WithRightContent = () => (
  <div className="w-full max-w-3xl">
    <ViewToggle
      className="flex-1"
      rightContent={
        <div className="flex items-center gap-3">
          <ShareButton
            url="https://waterman.app/report"
            className="h-[27px] w-[27px] rounded-full ring-1 ring-inset ring-ink/15 shadow-sm bg-newsprint"
          />
          <SignInPill />
        </div>
      }
    />
  </div>
);

export const InPageChrome = () => (
  <div className="w-full max-w-3xl bg-newsprint flex flex-col gap-4">
    <div className="flex items-center gap-3">
      <span className="font-headline font-black uppercase text-sm tracking-tight text-ink leading-none whitespace-nowrap">
        Waterman
      </span>
      <ViewToggle compact className="flex-1" rightContent={<SignInPill />} />
    </div>
    <Divider weight="light" />
    <Heading level={3}>Saturday 18 May</Heading>
    <Text variant="muted">Scheveningen Noord · 19 kt NW gusting 26 kt · 0.8 m @ 6 s · water 17°C</Text>
  </div>
);
