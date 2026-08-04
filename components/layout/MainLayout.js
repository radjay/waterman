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
 * `wide` exists for the data-heavy screens whose whole value is horizontal
 * resolution (the week strip, the model grid), where capping at 900px would
 * spend the desktop work and keep the mobile compression.
 */
export function MainLayout({ children, wide = false, nav = true, className = "" }) {
  return (
    <>
      {nav && <TopNav />}
      <main
        className={`${
          wide ? "max-w-[1200px]" : "max-w-[900px]"
        } mx-auto px-[18px] pt-4 pb-24 md:px-8 md:pb-16 min-h-screen bg-page overflow-visible ${className}`}
      >
        {children}
      </main>
      {nav && <BottomNav />}
    </>
  );
}
