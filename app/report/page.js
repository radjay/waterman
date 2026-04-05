import { Suspense } from "react";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { Loader } from "../../components/common/Loader";
import HomeContent from "../HomeContent";
import { getCachedReportData } from "../../lib/convex-cache";

export const metadata = {
  title: 'The Waterman Report',
};

export default async function ReportPage() {
  // Pre-fetch wingfoil data (the app's default sport) so HomeContent has
  // data to display on first render without a client-side round-trip.
  // HomeContent re-fetches with the user's selected sport + personalization
  // once auth resolves or the user changes their filter.
  let initialData = null;
  try {
    initialData = await getCachedReportData(["wingfoil"]);
  } catch (error) {
    console.error("Failed to prefetch report data:", error);
  }

  return (
    <Suspense fallback={
      <MainLayout>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <Loader />
        </div>
        <Footer />
      </MainLayout>
    }>
      <HomeContent initialData={initialData} initialDataSport="wingfoil" />
    </Suspense>
  );
}
