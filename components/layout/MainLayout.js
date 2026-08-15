import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";

/**
 * The shared page container.
 *
 * Gutters are 20px on a phone and 40px at width, which is the handoff's
 * measure. One width for every page, and it is the header's — a body narrower
 * than the bar above it reads as a misalignment rather than as a deliberate
 * measure, and it used to be different on different screens.
 *
 * The 96px tail is not padding for looks: the bottom nav floats over the page,
 * so every scroll container has to reserve the space or the last card ends up
 * behind the pill. It lives here rather than on each screen because forgetting
 * it is invisible until someone scrolls to the bottom.
 */
export function MainLayout({ children, nav = true, tools = null, className = "" }) {
  return (
    <>
      {nav && <TopNav tools={tools} />}
      <main
        className={`max-w-[1440px] mx-auto px-5 pt-[22px] md:px-10 md:pt-7 min-h-screen bg-page ${className}`}
      >
        {children}
        {nav && <div className="h-24 md:h-8" aria-hidden="true" />}
      </main>
      {nav && <BottomNav />}
    </>
  );
}
