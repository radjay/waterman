import { Suspense } from "react";

export const dynamic = "force-dynamic";
import { MainLayout } from "../../../components/layout/MainLayout";
import { Header } from "../../../components/layout/Header";
import { Loader } from "../../../components/common/Loader";
import SportFilterContent from "./SportFilterContent";
import { getCachedReportData } from "../../../lib/convex-cache";

// Map URL sport values to internal sport values (mirrored in SportFilterContent)
const sportMap = {
  wing: "wingfoil",
  kite: "kitesurfing",
  surf: "surfing",
};

export default async function SportFilterPage({ params }) {
  const { sport: urlSport } = await params;
  const internalSport = sportMap[urlSport?.toLowerCase()] || "wingfoil";

  // Pre-fetch forecast data for the requested sport so SportFilterContent
  // has content to display on first render without a client-side round-trip.
  // The component re-fetches with userId for personalization once auth resolves.
  let initialData = null;
  try {
    initialData = await getCachedReportData([internalSport]);
  } catch (error) {
    console.error("Failed to prefetch sport filter data:", error);
  }

  return (
    <Suspense fallback={
      <MainLayout>
        <Header />
        <Loader />
      </MainLayout>
    }>
      <SportFilterContent
        initialData={initialData}
        initialDataSport={internalSport}
      />
    </Suspense>
  );
}
