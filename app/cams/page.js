import { Suspense } from "react";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Loader } from "../../components/common/Loader";
import CamsContent from "./CamsContent";
import { getCachedCamsData } from "../../lib/convex-cache";

export default async function CamsPage() {
  // Pre-fetch all webcam spots with forecast data so CamsContent has
  // content to display on first render without a client-side round-trip.
  // CamsContent re-fetches with sport filter / userId once the user
  // interacts or authentication resolves.
  let initialData = null;
  try {
    initialData = await getCachedCamsData();
  } catch (error) {
    console.error("Failed to prefetch cams data:", error);
  }

  return (
    <Suspense
      fallback={
        <MainLayout>
          <Header />
          <div className="flex items-center justify-center min-h-screen">
            <Loader />
          </div>
        </MainLayout>
      }
    >
      <CamsContent initialData={initialData} />
    </Suspense>
  );
}
