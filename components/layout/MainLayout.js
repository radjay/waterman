import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";

/**
 * MainLayout — the shared page container.
 *
 * Horizontal padding is 18px to match the handoff. The previous px-4 (16px)
 * made every new screen 2px narrow on both sides, which compounds across a
 * design specified to the pixel.
 *
 * No side borders: the handoff's screens are flat surfaces separated by border
 * and fill, not a bordered column.
 *
 * One width for every page, and it is the header's: max-w-[1200px] with px-8,
 * exactly what TopNav uses. A body narrower than the bar above it reads as a
 * misalignment rather than as a deliberate measure, and it was different on
 * different screens — Next and the confidence view opted into 1200 while Now
 * and Cams sat at 900 under the same 1200-wide header.
 */
export function MainLayout({ children, nav = true, className = "" }) {
  return (
    <>
      {nav && <TopNav />}
      <main
        className={`max-w-[1200px] mx-auto px-[18px] pt-4 pb-24 md:px-8 md:pb-16 min-h-screen bg-page overflow-visible ${className}`}
      >
        {children}
      </main>
      {nav && <BottomNav />}
    </>
  );
}
