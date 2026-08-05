import { ScoreFactors } from 'waterman';

// What the scorer actually weighed. Every condition_scores row already stores
// this breakdown and nothing in the app showed it — on a screen whose job is
// "do I believe it", a stored explanation of how the number was reached is the
// most direct answer available.
//
// Bars use the same ramp as the week strip, so a reader who has learned what
// "great" looks like there needs no second legend.
export const AllThree = () => (
  <div className="max-w-md">
    <ScoreFactors
      factors={{ windQuality: 88, waveQuality: 62, tideQuality: 74 }}
      reasoning="Steady 18–21 kn NNW through the afternoon with a short chop; the tide turns at 16:20 and softens the inside."
    />
  </div>
);

// Wind spots store no wave or tide quality — the missing dimensions are dropped
// rather than drawn at zero, which would read as "bad" instead of "not scored".
export const WindOnly = () => (
  <div className="max-w-md">
    <ScoreFactors factors={{ windQuality: 91 }} reasoning="Nortada filling in hard by midday." />
  </div>
);

export const ReasoningOnly = () => (
  <div className="max-w-md">
    <ScoreFactors reasoning="No per-factor breakdown stored for this slot yet." />
  </div>
);
