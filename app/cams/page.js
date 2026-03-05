"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Loader } from "../../components/common/Loader";
import { EmptyState } from "../../components/common/EmptyState";
import { WebcamCard } from "../../components/webcam/WebcamCard";
import { WebcamFullscreen } from "../../components/webcam/WebcamFullscreen";
import { TvMode } from "../../components/webcam/TvMode";
import { useAuth, useUser } from "../../components/auth/AuthProvider";
import { Tv, MapPin, SlidersHorizontal, X } from "lucide-react";
import { PillToggle } from "../../components/ui/PillToggle";
import { FilterGroup } from "../../components/ui/FilterGroup";
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
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const sportLabel = { "": "All", wingfoil: "Wing", kitesurfing: "Kite", surfing: "Surf" }[selectedSport];

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
    e.stopPropagation();

    if (!sessionToken) {
      router.push("/auth/login");
      return;
    }

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
      setFavoriteSpots(favoriteSpots);
    }
  };

  const handleWebcamClick = (webcam) => setFocusedWebcam(webcam);
  const handleCloseFullscreen = () => setFocusedWebcam(null);
  const handleNavigateWebcam = (webcam) => setFocusedWebcam(webcam);

  return (
    <MainLayout>
      <Header />

      {/* Filter bar — always in normal document flow, never overlaying cams */}
      <div className="pb-4 pt-2">
        {filtersExpanded ? (
          /* Expanded: full filter bar, TV Mode hidden */
          <div className="rounded-xl bg-ink/[0.04] px-4 md:-mx-2 py-3">
            <div className="flex flex-col md:flex-row md:items-center md:gap-3">

              {/* Filters label */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setFiltersExpanded(false)}
                  className="flex items-center gap-1.5 text-faded-ink hover:text-ink transition-colors duration-fast ease-smooth"
                  aria-expanded={true}
                >
                  <SlidersHorizontal size={14} strokeWidth={2} aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Filters</span>
                </button>
                <div className="flex-1 md:hidden" />
                <button
                  onClick={() => setFiltersExpanded(false)}
                  className="md:hidden p-1 rounded-full text-faded-ink/50 hover:text-ink hover:bg-ink/[0.06] transition-colors"
                  aria-label="Close filters"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>

              {/* Vertical divider (desktop) */}
              <div className="hidden md:block w-px h-4 bg-ink/20 shrink-0" />

              {/* Sport filter */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 mt-3 pt-3 border-t border-ink/[0.06] md:mt-0 md:pt-0 md:border-0 flex-1">
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
              </div>

              {/* X (desktop) */}
              <button
                onClick={() => setFiltersExpanded(false)}
                className="hidden md:flex p-1 rounded-full text-faded-ink/50 hover:text-ink hover:bg-ink/[0.06] transition-colors"
                aria-label="Close filters"
              >
                <X size={14} strokeWidth={2} />
              </button>

            </div>
          </div>
        ) : (
          /* Collapsed: [TV Mode] [Filter pill] right-aligned */
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setTvMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink/[0.05] text-faded-ink hover:text-ink transition-colors duration-fast ease-smooth"
              aria-label="TV Mode"
            >
              <Tv size={14} strokeWidth={2} />
              <span className="text-xs font-semibold uppercase tracking-wider leading-none">TV Mode</span>
            </button>

            <button
              onClick={() => setFiltersExpanded(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink/[0.05] text-faded-ink hover:text-ink transition-colors duration-fast ease-smooth"
              aria-expanded={false}
            >
              <SlidersHorizontal size={14} strokeWidth={2} aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider leading-none">
                {sportLabel}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Webcam grid */}
      <div className="pb-12">
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

            {/* Request a Spot tile — matches full WebcamCard height (video + info row) */}
            <Link
              href="/request-spot"
              className="flex flex-col rounded-xl border-2 border-dashed border-ink/15 hover:border-ink/30 bg-ink/[0.02] hover:bg-ink/[0.04] transition-colors duration-fast ease-smooth"
            >
              {/* Content area — flex-1 fills the space equivalent to the video area */}
              <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-0">
                <MapPin size={22} className="text-faded-ink/60" />
              </div>
              {/* Info row — mirrors WebcamCard's px-4 py-2 spot info section */}
              <div className="px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-faded-ink/60">
                  Request a Spot
                </span>
              </div>
            </Link>
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
