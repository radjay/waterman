import { ConfidenceContent } from "./ConfidenceContent";

export const metadata = {
  title: "Waterman — Do I believe it?",
  description: "Where the models agree, what the station reads, and who is out.",
};

/**
 * Screen 03 — Confidence. Reached by tapping a window on Next.
 *
 * This is the only place the numeric score appears at any size. Everywhere else
 * the score is a detail, not the headline.
 */
export default async function WindowPage({ params }) {
  const { day, start } = await params;
  return <ConfidenceContent dayStart={Number(day)} windowStart={Number(start)} />;
}
