import { Suspense } from "react";
import { MainLayout } from "../components/layout/MainLayout";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { Loader } from "../components/common/Loader";
import HomeContent from "./HomeContent";

export const metadata = {
  title: 'The Waterman Report',
};

export default function Home() {
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
      <HomeContent />
    </Suspense>
  );
}
