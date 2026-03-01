"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { ViewToggle } from "../../components/layout/ViewToggle";
import { Footer } from "../../components/layout/Footer";
import { Loader2, Plus, ArrowRight } from "lucide-react";
import { useAuth, useUser } from "../../components/auth/AuthProvider";
import { formatDate, formatTime } from "../../lib/utils";
import { enrichSlots, markIdealSlots, markContextualSlots } from "../../lib/slots";
import { isDaylightSlot, isAfterSunset, isNighttimeSlot } from "../../lib/daylight";
import { WebcamCard } from "../../components/webcam/WebcamCard";
import { WebcamFullscreen } from "../../components/webcam/WebcamFullscreen";
import { useOnboarding } from "../../hooks/useOnboarding";
import { OnboardingFooter } from "../../components/onboarding/OnboardingFooter";
import { OnboardingModal } from "../../components/onboarding/OnboardingModal";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function DashboardPage() {
  const router = useRouter();
  const { sessionToken, isAuthenticated, loading: authLoading } = useAuth();
  const user = useUser();

  // Onboarding state (skip for authenticated users)
  const { needsOnboarding, showFooter, isLoading: onboardingLoading, markOnboardingComplete, dismissFooter } = useOnboarding(user);

  const [loading, setLoading] = useState(true);
  const [todaySlots, setTodaySlots] = useState([]);
  const [webcams, setWebcams] = useState([]);
  const [spotsMap, setSpotsMap] = useState({});
  const [mostRecentScrapeTimestamp, setMostRecentScrapeTimestamp] = useState(null);
  const [focusedWebcam, setFocusedWebcam] = useState(null);

  // Get user's selected sport (default to wingfoil)
  const selectedSport = user?.selectedSport || "wingfoil";

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        // Fetch all spots (don't filter by selected sport - we want to show best conditions for ALL sports)
        const fetchedSpots = await client.query(api.spots.list, {});

        // Create spots map
        const spotsMapObj = {};
        fetchedSpots.forEach((spot) => {
          spotsMapObj[spot._id] = spot;
        });
        setSpotsMap(spotsMapObj);

        // Determine which spots to fetch conditions for
        // Use database preferences for authenticated users, localStorage for anonymous users
        let relevantSpots = fetchedSpots;
        let favoriteSpotIds = new Set();

        if (user && user.favoriteSpots && user.favoriteSpots.length > 0) {
          // Authenticated user with favorites in database
          favoriteSpotIds = new Set(user.favoriteSpots);
          relevantSpots = fetchedSpots.filter((spot) => favoriteSpotIds.has(spot._id));
        } else if (!user) {
          // Anonymous user - check localStorage for onboarding preferences
          const preferencesStr = localStorage.getItem("waterman_preferences");
          if (preferencesStr) {
            try {
              const preferences = JSON.parse(preferencesStr);
              if (preferences.favoriteSpots && preferences.favoriteSpots.length > 0) {
                favoriteSpotIds = new Set(preferences.favoriteSpots);
                relevantSpots = fetchedSpots.filter((spot) => favoriteSpotIds.has(spot._id));
              } else {
                // No favorite spots in localStorage - show top 10
                relevantSpots = fetchedSpots.slice(0, 10);
              }
            } catch (e) {
              console.error("Error parsing localStorage preferences:", e);
              relevantSpots = fetchedSpots.slice(0, 10);
            }
          } else {
            // No localStorage preferences - show top 10 spots
            relevantSpots = fetchedSpots.slice(0, 10);
          }
        } else {
          // Authenticated user with no favorites - show top 10
          relevantSpots = fetchedSpots.slice(0, 10);
        }

        // Fetch today's slots for these spots (ALL sports, not just selected)
        const slotsPromises = relevantSpots.map(async (spot) => {
          const spotSports = spot.sports && spot.sports.length > 0 ? spot.sports : ["wingfoil"];
          // Show all sports instead of filtering by selectedSport
          const relevantSports = spotSports;

          const configPromises = relevantSports.map((sport) =>
            client.query(api.spots.getSpotConfig, { spotId: spot._id, sport })
          );

          const usePersonalizedScores = user && user.showPersonalizedScores !== false;
          const scoresPromises = relevantSports.map((sport) =>
            client.query(api.spots.getConditionScores, {
              spotId: spot._id,
              sport,
              userId: usePersonalizedScores && user?._id ? user._id : undefined,
            })
          );

          const [slotsData, configs] = await Promise.all([
            client.query(api.spots.getForecastSlots, { spotId: spot._id }),
            Promise.all(configPromises),
          ]);

          const scoresArrays = await Promise.all(scoresPromises);
          const scoresMap = {};
          scoresArrays.forEach((scores, index) => {
            const sport = relevantSports[index];
            scores.forEach((score) => {
              const key = `${score.timestamp}_${sport}`;
              scoresMap[key] = score;
            });
          });

          if (!slotsData) return [];

          const enriched = enrichSlots(slotsData, spot, configs, scoresMap, relevantSports);

          // Filter to today's slots only
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          return enriched.filter((slot) => {
            const slotDate = new Date(slot.timestamp);
            slotDate.setHours(0, 0, 0, 0);
            return slotDate.getTime() === today.getTime();
          });
        });

        const allSlots = (await Promise.all(slotsPromises)).flat();

        // Filter to daylight slots with good scores (>= 60)
        // Keep ALL of today's ideal slots visible until midnight, regardless of current time
        const goodSlots = allSlots.filter((slot) => {
          if (slot.isTideOnly) return false;
          if (isNighttimeSlot(new Date(slot.timestamp))) return false;

          const spot = spotsMapObj[slot.spotId];
          if (!spot) return false;

          // Show all daylight slots for today (don't filter by current time)
          // This ensures users can see what conditions were/are/will be throughout the day
          const isDaylight = isDaylightSlot(new Date(slot.timestamp), spot);
          const afterSunset = isAfterSunset(new Date(slot.timestamp), spot);

          if (!isDaylight || afterSunset) return false;

          return slot.score && slot.score.value >= 60;
        });

        // Sort by score (best first)
        goodSlots.sort((a, b) => (b.score?.value || 0) - (a.score?.value || 0));

        setTodaySlots(goodSlots.slice(0, 6)); // Top 6 slots

        // Fetch webcams from favorite spots (using the same favoriteSpotIds from above)
        if (favoriteSpotIds.size > 0) {
          const favoriteWebcams = fetchedSpots.filter(
            (spot) => favoriteSpotIds.has(spot._id) && spot.webcamUrl
          );
          setWebcams(favoriteWebcams);
        } else {
          // No favorites - show all webcams (limit to 4)
          const allWebcams = fetchedSpots.filter((spot) => spot.webcamUrl);
          setWebcams(allWebcams.slice(0, 4));
        }

        // Fetch scrape timestamp
        const scrapeTimestamp = await client.query(api.spots.getMostRecentScrapeTimestamp);
        setMostRecentScrapeTimestamp(scrapeTimestamp);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [selectedSport, user, sessionToken]);

  const handleViewChange = (view) => {
    if (view === "list") {
      router.push("/report");
    } else if (view === "calendar") {
      router.push("/calendar");
    } else if (view === "cams") {
      router.push("/cams");
    } else if (view === "sessions") {
      router.push("/journal");
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
    <>
      {/* Show onboarding modal on first visit (dismissible on dashboard)
          Wait for both auth and onboarding state to be loaded to prevent flash */}
      {!authLoading && !onboardingLoading && needsOnboarding && (
        <OnboardingModal
          onComplete={markOnboardingComplete}
          onDismiss={markOnboardingComplete}
          isDismissible={true}
        />
      )}

      <MainLayout>
        <Header />

      {/* Tabs bar - sticky, scrollable on mobile */}
      <div className="sticky top-[57px] z-40 bg-newsprint border-b border-ink/20 py-3 md:py-4 before:absolute before:inset-x-0 before:-top-4 before:h-4 before:bg-newsprint before:-z-10">
        <div className="overflow-x-auto scrollbar-hide px-4">
          <ViewToggle onChange={handleViewChange} />
        </div>
      </div>

      <div className="h-4" /> {/* Spacer */}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-ink/60 animate-spin" />
        </div>
      ) : (
        <div className="px-4 pb-12 space-y-10">
          {/* Today's Best Conditions */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-ink">Today's Best Conditions</h2>
              <button
                onClick={() => router.push("/report")}
                className="flex items-center gap-1 text-xs font-bold uppercase text-ink/60 hover:text-ink transition-colors"
              >
                See All
                <ArrowRight size={14} />
              </button>
            </div>

            {todaySlots.length === 0 ? (
              <p className="text-ink/60 text-sm py-4">No good conditions forecast for today</p>
            ) : (
              <div className="space-y-2">
                {todaySlots.map((slot) => {
                  const spot = spotsMap[slot.spotId];
                  if (!spot) return null;

                  return (
                    <button
                      key={`${slot.spotId}-${slot.timestamp}`}
                      onClick={() => router.push(`/report?day=${encodeURIComponent(formatDate(new Date()))}`)}
                      className="w-full p-3 rounded border border-ink/20 hover:border-ink/30 hover:bg-ink/5 transition-all text-left bg-newsprint"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-bold text-ink">{spot.name}</div>
                          <div className="text-sm text-ink/60">{formatTime(new Date(slot.timestamp))}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-2xl font-bold text-green-700">{slot.score?.value}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Log a Session button - only show for authenticated users */}
            {isAuthenticated && (
              <button
                onClick={() => router.push("/journal/new")}
                className="flex items-center justify-center gap-2 px-4 py-2.5 mt-4 bg-ink/5 text-ink rounded border border-ink/20 hover:border-ink/30 hover:bg-ink/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-bold uppercase">Log a Session</span>
              </button>
            )}
          </section>

          {/* Webcams Preview */}
          {webcams.length > 0 && (
            <section>
              {/* Visual separator */}
              <div className="border-t border-ink/20 mb-6"></div>

              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-ink">Live Webcams</h2>
                <button
                  onClick={() => router.push("/cams")}
                  className="flex items-center gap-1 text-xs font-bold uppercase text-ink/60 hover:text-ink transition-colors"
                >
                  View Report
                  <ArrowRight size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {webcams.map((spot) => (
                  <div
                    key={spot._id}
                    onClick={() => handleWebcamClick(spot)}
                    className="cursor-pointer group"
                  >
                    <WebcamCard spot={spot} showHoverButtons />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <Footer mostRecentScrapeTimestamp={mostRecentScrapeTimestamp} />

      {/* Fullscreen Webcam Viewer */}
      {focusedWebcam && (
        <WebcamFullscreen
          spot={focusedWebcam}
          onClose={handleCloseFullscreen}
          allWebcams={webcams}
          onNavigate={handleNavigateWebcam}
        />
      )}
      </MainLayout>

      {/* Show onboarding footer if user hasn't completed onboarding
          Wait for both auth and onboarding state to be loaded to prevent flash */}
      {!authLoading && !onboardingLoading && showFooter && <OnboardingFooter onDismiss={dismissFooter} />}
    </>
  );
}
