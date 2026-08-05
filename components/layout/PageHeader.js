"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Shared page chrome for tab roots and detail screens.
 *
 * One title size, one subtitle treatment, one header padding. Detail screens
 * opt into a single back control here — never a second "back" link at the
 * bottom of the page.
 *
 * Layout:
 *   [←] Title                    [actions]   ← compact (share, one chip)
 *       Subtitle
 *       [tools…]                              ← filters that need room
 *
 * @param {string|React.ReactNode} title - Page title (ignored when children set)
 * @param {React.ReactNode} [children] - Custom title row (e.g. title + SpotPicker)
 * @param {React.ReactNode} [subtitle] - One-line description under the title
 * @param {string} [backHref] - Where back goes (preferred over history)
 * @param {() => void} [onBack] - Custom back handler; wins over backHref
 * @param {React.ReactNode} [actions] - Compact top-right controls
 * @param {React.ReactNode} [tools] - Filter chips on their own row under the title
 */
export function PageHeader({
  title,
  children,
  subtitle = null,
  backHref = null,
  onBack = null,
  actions = null,
  tools = null,
  className = "",
}) {
  const router = useRouter();
  const showBack = Boolean(backHref || onBack);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (backHref) router.push(backHref);
  };

  return (
    <header className={`pt-[22px] pb-3 ${className}`}>
      <div className="flex items-start gap-3">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            className="mt-1.5 flex-none text-faded-ink hover:text-ink transition-colors duration-fast ease-smooth focus-ring"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-headline font-extrabold text-[25px] tracking-display-tight text-ink leading-tight min-w-0">
              {children ?? title}
            </h1>
            {actions && (
              <div className="flex items-center gap-2 flex-none mt-0.5">{actions}</div>
            )}
          </div>
          {subtitle != null && subtitle !== false && (
            <div className="mt-1 text-[13px] text-faded-ink leading-[1.4]">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {tools && (
        <div className="flex items-center gap-2 flex-wrap mt-3">{tools}</div>
      )}
    </header>
  );
}
