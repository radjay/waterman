import { BottomNav } from "./BottomNav";

/**
 * MainLayout — the shared page container.
 *
 * Default reading width stays 900px. `wide` exists for the data-heavy screens
 * whose whole value is horizontal resolution (the week strip, the model grid),
 * where capping at 900px would spend the desktop work and keep the mobile
 * compression. Widening globally would hurt the prose-width screens, so this is
 * opt-in per route.
 */
export function MainLayout({ children, wide = false, className = "" }) {
  return (
    <>
      <main
        className={`${
          wide ? "max-w-[1200px]" : "max-w-[900px]"
        } mx-auto px-4 pt-4 pb-24 md:p-8 md:pb-16 border-l border-r border-card min-h-screen bg-page overflow-visible ${className}`}
      >
        {children}
      </main>
      <BottomNav />
    </>
  );
}
