import { Suspense } from "react";

export const dynamic = "force-dynamic";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Loader } from "../../components/common/Loader";
import DashboardContent from "./DashboardContent";
import { getCachedDashboardData } from "../../lib/convex-cache";

export default async function DashboardPage() {
  // Pre-fetch anonymous top-10 dashboard data so DashboardContent has
  // content to display on first render without a client-side round-trip.
  // DashboardContent re-fetches with userId + user preferences once
  // authentication resolves.
  let initialData = null;
  try {
    initialData = await getCachedDashboardData();
  } catch (error) {
    console.error("Failed to prefetch dashboard data:", error);
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
      <DashboardContent initialData={initialData} />
    </Suspense>
  );
}
