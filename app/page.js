import { NowContent } from "./NowContent";

export const metadata = {
  title: "Waterman — Can I go?",
  description: "A verdict first: can you go right now, and why we think so.",
};

/**
 * Screen 01 — Now.
 *
 * `/` used to redirect to /dashboard. It now answers "can I go" before
 * anything else; /dashboard survives, restyled, under More.
 */
export default function NowPage() {
  return <NowContent />;
}
