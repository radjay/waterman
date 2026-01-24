"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { ViewToggle } from "../../components/layout/ViewToggle";
import { Footer } from "../../components/layout/Footer";
import { Loader } from "../../components/common/Loader";
import { EmptyState } from "../../components/common/EmptyState";
import { WebcamCard } from "../../components/webcam/WebcamCard";
import { WebcamFullscreen } from "../../components/webcam/WebcamFullscreen";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

function CamsContent() {
  const router = useRouter();
  const [webcams, setWebcams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [focusedWebcam, setFocusedWebcam] = useState(null);

  // Fetch all webcam spots
  useEffect(() => {
    async function fetchWebcams() {
      setLoading(true);
      try {
        const webcamSpots = await client.query(api.spots.listWebcams);
        setWebcams(webcamSpots);
      } catch (error) {
        console.error("Error fetching webcams:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchWebcams();
  }, []);

  // Handle view toggle
  const handleViewChange = (view) => {
    if (view === "list") {
      router.push("/");
    } else if (view === "calendar") {
      router.push("/calendar");
    }
  };

  // Handle webcam click (open fullscreen)
  const handleWebcamClick = (webcam) => {
    setFocusedWebcam(webcam);
  };

  // Handle close fullscreen
  const handleCloseFullscreen = () => {
    setFocusedWebcam(null);
  };

  // Handle navigate between webcams
  const handleNavigateWebcam = (webcam) => {
    setFocusedWebcam(webcam);
  };

  return (
    <MainLayout>
      <Header />
      <div className="flex items-center justify-between gap-2 mb-6">
        <ViewToggle onChange={handleViewChange} />
      </div>

      {loading ? (
        <Loader />
      ) : webcams.length === 0 ? (
        <EmptyState message="No webcams available" />
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="font-headline text-2xl font-bold text-ink mb-2">
              Webcams
            </h1>
            <p className="text-ink/60 text-sm">
              Live streams with current wave, wind, and tide conditions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {webcams.map((webcam) => (
              <div
                key={webcam._id}
                onClick={() => handleWebcamClick(webcam)}
                className="cursor-pointer transition-transform hover:scale-[1.02]"
              >
                <WebcamCard spot={webcam} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen webcam modal */}
      {focusedWebcam && (
        <WebcamFullscreen
          spot={focusedWebcam}
          onClose={handleCloseFullscreen}
          allWebcams={webcams}
          onNavigate={handleNavigateWebcam}
        />
      )}

      <Footer />
    </MainLayout>
  );
}

export default function CamsPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <Header />
          <div className="flex items-center justify-center min-h-screen">
            <Loader />
          </div>
          <Footer />
        </MainLayout>
      }
    >
      <CamsContent />
    </Suspense>
  );
}

