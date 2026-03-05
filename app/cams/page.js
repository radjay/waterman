"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { Loader } from "../../components/common/Loader";
import { EmptyState } from "../../components/common/EmptyState";
import { WebcamCard } from "../../components/webcam/WebcamCard";
import { WebcamFullscreen } from "../../components/webcam/WebcamFullscreen";
import { TvMode } from "../../components/webcam/TvMode";
import { useAuth, useUser } from "../../components/auth/AuthProvider";
import { Tv, MapPin } from "lucide-react";
import { PillToggle } from "../../components/ui/PillToggle";
import { FilterGroup } from "../../components/ui/FilterGroup";
import { FilterBar } from "../../components/ui/FilterBar";
import Link from "next/link";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

function CamsContent() {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const user = useUser();
  const [webcams, setWebcams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [focusedWebcam, setFocusedWebcam] = useState(null);
  const [favoriteSpots, setFavoriteSpots] = useState([]);
  const [tvMode, setTvMode] = useState(false);
  const [selectedSport, setSelectedSport] = useState(""); // Empty = all sports

  // Sync favorite spots from user
  useEffect(() => {
    if (user && user.favoriteSpots) {
      setFavoriteSpots(user.favoriteSpots);
    }
  }, [user]);

  // Fetch all webcam spots
  useEffect(() => {
    async function fetchWebcams() {
      setLoading(true);
      try {
        const webcamSpots = await client.query(api.spots.listWebcams, {
          sports: selectedSport ? [selectedSport] : undefined,
        });
        setWebcams(webcamSpots);
      } catch (error) {
        console.error("Error fetching webcams:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchWebcams();
  }, [selectedSport]);

  // Toggle favorite spot
  const handleToggleFavorite = async (spotId, e) => {
    e.stopPropagation(); // Prevent card click

    if (!sessionToken) {
      // Redirect to login if not authenticated
      router.push("/auth/login");
      return;
    }

    // Optimistic update
    const newFavorites = favoriteSpots.includes(spotId)
      ? favoriteSpots.filter((id) => id !== spotId)
      : [...favoriteSpots, spotId];
    setFavoriteSpots(newFavorites);

    try {
      await client.mutation(api.auth.updatePreferences, {
        sessionToken,
        favoriteSpots: newFavorites,
      });
    } catch (error) {
      console.error("Error updating favorites:", error);
      // Revert on error
      setFavoriteSpots(favoriteSpots);
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

      {/* Filters + actions */}
      <FilterBar
        activeFilters={[
          { "": "All", wingfoil: "Wing", kitesurfing: "Kite", surfing: "Surf" }[selectedSport],
        ].filter(Boolean)}
        actions={
          <>
            <Link
              href="/request-spot"
              className="flex items-center gap-2 px-3 py-1.5 text-faded-ink hover:text-ink transition-all duration-fast ease-smooth flex-shrink-0"
            >
              <MapPin size={16} />
              <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider leading-none">Request a Spot</span>
            </Link>
            <button
              onClick={() => setTvMode(true)}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-ink/[0.04] text-ink hover:bg-ink/[0.08] transition-all duration-fast ease-smooth flex-shrink-0"
              aria-label="TV Mode"
            >
              <Tv size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider leading-none">TV Mode</span>
            </button>
          </>
        }
      >
        <FilterGroup label="Sport">
          <PillToggle
            name="sport"
            options={[
              { id: "", label: "All" },
              { id: "wingfoil", label: "Wing" },
              { id: "kitesurfing", label: "Kite" },
              { id: "surfing", label: "Surf" },
            ]}
            value={selectedSport}
            onChange={setSelectedSport}
          />
        </FilterGroup>
      </FilterBar>

      <div className="px-4 pb-12">
        {loading ? (
          <Loader />
        ) : webcams.length === 0 ? (
          <EmptyState message="No webcams available" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {webcams.map((webcam) => (
              <div
                key={webcam._id}
                onClick={() => handleWebcamClick(webcam)}
                className="cursor-pointer group"
              >
                <WebcamCard
                  spot={webcam}
                  showHoverButtons
                  isFavorite={favoriteSpots.includes(webcam._id)}
                  onToggleFavorite={(e) => handleToggleFavorite(webcam._id, e)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen webcam modal */}
      {focusedWebcam && (
        <WebcamFullscreen
          spot={focusedWebcam}
          onClose={handleCloseFullscreen}
          allWebcams={webcams}
          onNavigate={handleNavigateWebcam}
        />
      )}

      {/* TV Mode */}
      {tvMode && (
        <TvMode
          webcams={webcams}
          onClose={() => setTvMode(false)}
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

