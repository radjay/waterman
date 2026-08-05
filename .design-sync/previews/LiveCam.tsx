import { LiveCam } from 'waterman';

// The compact HLS player inside the Now verdict card. No stream resolves inside
// a preview, so this renders the component's real offline state — which is the
// honest thing to document anyway: a dead cam is information, and the card
// around it still carries the station reading.
//
// One story on purpose. A second spot renders the identical placeholder, which
// reads as a broken variant rather than as the point.
export const CamOffline = () => (
  <div className="relative w-full max-w-md aspect-video rounded-card-sm overflow-hidden border border-card">
    <LiveCam spot={{ _id: 'guincho', name: 'Praia do Guincho' }} />
  </div>
);
