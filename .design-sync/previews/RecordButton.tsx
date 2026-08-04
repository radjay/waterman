import { RecordButton } from 'waterman';

// Clip capture on a cam surface. Placed by WebcamCard and WebcamFullscreen,
// never by a screen directly.
//
// It returns null for a signed-out viewer, and a preview has no session — so
// the component genuinely renders nothing here. The card says so rather than
// showing an unexplained empty box: "requires auth" is the contract, and a
// blank card would read as broken.
export const RequiresASession = () => (
  <div className="max-w-md">
    <div className="relative w-full h-[180px] rounded-card-sm overflow-hidden bg-offline-bg flex items-end justify-end p-2">
      <RecordButton spotId="spot_guincho" />
    </div>
    <p className="text-[13px] leading-[1.5] text-faded-ink mt-3">
      Signed out, RecordButton renders nothing — which is why the cam frame above is
      empty. Signed in it sits bottom-right over the footage as a white pill: a red dot
      and <span className="font-data text-[12px] text-ink">RECORD</span>, switching to a
      running timer while capturing.
    </p>
  </div>
);
