"use client";

import { ArrowLeft } from "lucide-react";
import { SportFilterChip } from "../sport/SportFilterChip";
import { SpotTitle } from "../spot/SpotPickerSheet";

/**
 * The top line of every screen: what you are looking at, and what sport.
 *
 * Title on the left, sport on the right, in the same place on all four screens.
 * The title is the picker — the chevron beside it is the affordance — because
 * on Now, Live and Spot forecast the title IS the current spot, and a separate
 * control for changing it would sit next to a heading saying the same thing.
 *
 * The sport chip only shows on mobile: at width it lives in the header bar as a
 * segmented control, and two sport controls on one screen is one too many.
 *
 * `relative` so the picker sheet can anchor to the header rather than to the
 * viewport — a sheet pinned to the top of the page would detach from the title
 * it belongs to as soon as the screen scrolls.
 */
export function ScreenHeader({
  title,
  size = 24,
  desktopSize = 34,
  pickerOpen = false,
  onTogglePicker,
  onBack,
  sheet = null,
  tools = null,
  sport = true,
  className = "",
}) {
  return (
    <div className={`relative flex items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex-none text-faded-ink hover:text-ink transition-colors duration-fast ease-smooth focus-ring rounded-[4px]"
          >
            <ArrowLeft className="w-[19px] h-[19px] md:w-5 md:h-5" />
          </button>
        )}

        {onTogglePicker ? (
          <SpotTitle
            open={pickerOpen}
            onClick={onTogglePicker}
            size={size}
            desktopSize={desktopSize}
            className="flex-1"
          >
            {title}
          </SpotTitle>
        ) : (
          <h1
            className="font-headline font-extrabold tracking-display-tight text-ink leading-none truncate text-[length:var(--h)] md:text-[length:var(--hd)]"
            style={{ "--h": `${size}px`, "--hd": `${desktopSize}px` }}
          >
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2 flex-none">
        {tools}
        {sport && <SportFilterChip className="md:hidden" />}
      </div>

      {sheet}
    </div>
  );
}
