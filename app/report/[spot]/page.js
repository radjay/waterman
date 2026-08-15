import { Suspense } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { MainLayout } from "../../../components/layout/MainLayout";
import { ScreenSkeleton } from "../../../components/common/ScreenState";
import { spotFromSlug } from "../../../lib/spotSlug";
import SpotReportContent from "./SpotReportContent";

// Server-side Convex client for generateMetadata
const serverClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

/**
 * Dynamic metadata for link previews (Open Graph title, browser tab).
 * Resolves the slug server-side with a 3-second timeout fallback.
 */
export async function generateMetadata({ params }) {
  const { spot: slug } = await params;
  try {
    const spots = await Promise.race([
      serverClient.query(api.spots.list, {}),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    const targetSpot = spotFromSlug(spots, slug);
    if (targetSpot) {
      return { title: `${targetSpot.name} — Waterman Forecast` };
    }
  } catch {
    // Timeout or error — fall through to generic title
  }
  return { title: "Waterman Forecast" };
}

/**
 * /report/[spot] — single-spot forecast page.
 *
 * Server shell: provides Suspense boundary and loading skeleton.
 * SpotReportContent is a client component that handles data fetching
 * and rendering.
 */
export default async function SpotReportPage({ params }) {
  const { spot: slug } = await params;
  return (
    <Suspense
      fallback={
        <MainLayout>
          <ScreenSkeleton variant="cards" />
        </MainLayout>
      }
    >
      <SpotReportContent slug={slug} />
    </Suspense>
  );
}
