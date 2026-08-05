import { Suspense } from "react";
import { NextContent } from "../NextContent";

export async function generateMetadata({ params }) {
  const { spot: slug } = await params;
  // Title only — resolving the spot name needs the spots list, which is
  // client-fetched on this route. The slug itself is still human-readable.
  const pretty = typeof slug === "string"
    ? slug
        .split("-")
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(" ")
    : "Spot";
  return {
    title: `Waterman — Next windows at ${pretty}`,
    description: `When to go at ${pretty}: windows and a week you can share.`,
  };
}

/**
 * /next/[spot] — shareable deep link into one spot's week.
 *
 * The slug is the spot name (marina-de-cascais), same convention as /report/[spot].
 * NextContent resolves it to a spot id once report data loads.
 */
export default async function NextSpotPage({ params }) {
  const { spot } = await params;
  return (
    <Suspense fallback={null}>
      <NextContent spotSlug={spot} />
    </Suspense>
  );
}
