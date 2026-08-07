import { PageHeader, Badge, SportFilterChip, SportProvider } from 'waterman';
import { Share } from 'lucide-react';

// One title size, one subtitle treatment, one header padding for every screen.
// Detail screens opt into a single back control here — never a second "back"
// link at the bottom of the page.
//
// Stories mirror the four real call sites: a tab root, a detail screen, a root
// with a compact action, and one with a filter row that needs its own line.
const Stage = ({ children }: { children: React.ReactNode }) => (
  <div className="max-w-[560px] bg-page">{children}</div>
);

// Now, More — a tab root states what the screen is for and nothing else.
export const TabRoot = () => (
  <Stage>
    <PageHeader title="Go now" subtitle="Best of your spots, right now." />
  </Stage>
);

// The window screen: back to the list it came from, and a subtitle that carries
// the actual window rather than repeating the title.
export const DetailWithBack = () => (
  <Stage>
    <PageHeader
      title="Praia do Guincho"
      backHref="/next"
      subtitle={
        <span className="font-data text-ink tabular-nums">
          <span className="font-bold text-ink">Tuesday</span>
          <span className="text-faded-ink mx-1.5">·</span>
          <span className="text-ink">12:00–15:00</span>
        </span>
      }
    />
  </Stage>
);

// `actions` is for one compact control at the title's right — a share button,
// a single chip. Anything that needs room belongs in `tools`.
export const WithAction = () => (
  <Stage>
    <PageHeader
      title="Go now"
      subtitle="Best of your spots, right now."
      actions={
        <button
          aria-label="Share"
          className="w-9 h-9 flex-none flex items-center justify-center rounded-pill border border-btn text-faded-ink focus-ring"
        >
          <Share size={14} />
        </button>
      }
    />
  </Stage>
);

// `tools` gets its own row under the title so filters never squeeze the
// heading, and `children` replaces the title outright when the screen wears its
// scope picker as part of the sentence.
export const WithTools = () => (
  <SportProvider>
    <Stage>
      <PageHeader
        subtitle="Upcoming windows, then the week at a glance."
        tools={
          <>
            <SportFilterChip />
            <Badge variant="live">
              <span className="w-1.5 h-1.5 rounded-full bg-page" />
              LIVE 18 kn
            </Badge>
          </>
        }
      >
        Next windows
      </PageHeader>
    </Stage>
  </SportProvider>
);
