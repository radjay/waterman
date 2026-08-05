import { Suspense } from "react";
import { NextContent } from "./NextContent";

export const metadata = {
  title: "Waterman — Next windows",
  description: "When to go: one answer, then a week you can read at a glance.",
};

/**
 * Screen 02 — Next (coast / favorites scope).
 *
 * A named spot lives at `/next/[spot]` so the week can be shared as a path.
 * Both entry points render the same client tree; Suspense covers useSearchParams
 * for legacy `?spot=` upgrades.
 */
export default function NextPage() {
  return (
    <Suspense fallback={null}>
      <NextContent />
    </Suspense>
  );
}
