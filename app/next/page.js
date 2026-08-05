import { NextContent } from "./NextContent";

export const metadata = {
  title: "Waterman — Next windows",
  description: "When to go: one answer, then a week you can read at a glance.",
};

/**
 * Screen 02 — Next.
 *
 * Report and Calendar collapse into this. Both survive under More: the detailed
 * table carries more than the week strip does, and the shareable single-sport
 * routes still work.
 */
export default function NextPage() {
  return <NextContent />;
}
