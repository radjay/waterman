import { LabsSection } from 'waterman';

// details/summary, so it is keyboard-operable and expandable before hydration.
// Collapsed by default: what is inside is interesting but is never the verdict,
// and rendering it inline implied the answer above was derived from it.

export const Collapsed = () => (
  <div className="max-w-md">
    <LabsSection title="IN THE WATER" caption="Estimated from webcam footage">
      <p className="text-[13px] text-faded-ink">Hidden until the disclosure is opened.</p>
    </LabsSection>
  </div>
);

export const Open = () => (
  <div className="max-w-md">
    <LabsSection title="MODEL COMPARISON" caption="Five models, live from the widget" defaultOpen>
      <div className="flex flex-col gap-[5px] pt-2">
        {[
          ['GFS', [true, true, true]],
          ['ECMWF', [true, true, false]],
          ['ICON-EU', [false, false, false]],
        ].map(([label, votes]) => (
          <div key={label as string} className="flex gap-1 items-center">
            <span className="w-[62px] font-data text-[9px] text-faded-ink">{label}</span>
            {(votes as boolean[]).map((v, i) => (
              <span key={i} className={`flex-1 h-5 rounded ${v ? 'bg-accent' : 'bg-track'}`} />
            ))}
          </div>
        ))}
      </div>
    </LabsSection>
  </div>
);
