"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { Plus, ArrowRight } from "lucide-react";
import { Loader } from "../../components/common/Loader";
import { Heading } from "../../components/ui/Heading";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { Divider } from "../../components/ui/Divider";
import { Section } from "../../components/ui/Section";
import { useAuth, useUser } from "../../components/auth/AuthProvider";
import { formatDate, formatTime, getCardinalDirection } from "../../lib/utils";
import { ScoreCard } from "../../components/ui/ScoreCard";
import { ScoreDisplay } from "../../components/ui/ScoreDisplay";
import { SportBadge } from "../../components/ui/SportBadge";
import { ConditionLine } from "../../components/ui/ConditionLine";
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
  const [dataVersion, setDataVersion] = useState(0); // incremented after onboarding to trigger refetch
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
        let userSelectedSports = null; // null = show all sports

        if (user && user.favoriteSpots && user.favoriteSpots.length > 0) {
          // Authenticated user with favorites in database
          favoriteSpotIds = new Set(user.favoriteSpots);
          relevantSpots = fetchedSpots.filter((spot) => favoriteSpotIds.has(spot._id));
          if (user.selectedSport) userSelectedSports = [user.selectedSport];
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
              if (preferences.sports && preferences.sports.length > 0) {
                userSelectedSports = preferences.sports;
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

        // Fetch today's slots for these spots, filtered by the user's selected sports
        const slotsPromises = relevantSpots.map(async (spot) => {
          const spotSports = spot.sports && spot.sports.length > 0 ? spot.sports : ["wingfoil"];
          const relevantSports = userSelectedSports
            ? spotSports.filter((s) => userSelectedSports.includes(s))
            : spotSports;
          if (relevantSports.length === 0) return [];

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
  }, [selectedSport, user, sessionToken, dataVersion]);

  // After onboarding, mark complete AND re-fetch dashboard data with new preferences
  const handleOnboardingComplete = (preferences) => {
    markOnboardingComplete(preferences);
    setDataVersion((v) => v + 1);
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
          onComplete={handleOnboardingComplete}
          onDismiss={markOnboardingComplete}
          isDismissible={true}
        />
      )}

      <MainLayout>
        <Header />

      {loading ? (
        <Loader />
      ) : (
        <div className="pb-12 pt-4 space-y-10">
          {/* Today's Best Conditions */}
          <Section
            title="Today's Best Conditions"
            action={
              <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => router.push("/report")}>
                See All
              </Button>
            }
          >

            {todaySlots.length === 0 ? (
              <Text variant="muted" className="text-sm py-4">No good conditions forecast for today</Text>
            ) : (
              <div className="space-y-2">
                {todaySlots.map((slot) => {
                  const spot = spotsMap[slot.spotId];
                  if (!spot) return null;

                  return (
                    <ScoreCard
                      key={`${slot.spotId}-${slot.timestamp}`}
                      score={slot.score?.value}
                      onClick={() => router.push(`/report?day=${encodeURIComponent(formatDate(new Date()))}`)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <SportBadge sport={slot.sport} />
                            <span className="font-bold text-ink truncate">{spot.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-ink/60">
                            <span>{formatTime(new Date(slot.timestamp))}</span>
                            <span className="text-ink/30">·</span>
                            <ConditionLine
                              speed={slot.speed}
                              gust={slot.gust}
                              direction={slot.direction}
                              waveHeight={slot.waveHeight}
                              wavePeriod={slot.wavePeriod}
                              sport={slot.sport}
                            />
                          </div>
                        </div>
                        <ScoreDisplay score={slot.score?.value} size="lg" />
                      </div>
                    </ScoreCard>
                  );
                })}
              </div>
            )}

            {/* Log a Session button - only show for authenticated users */}
            {isAuthenticated && (
              <Button
                variant="secondary"
                icon={Plus}
                fullWidth
                onClick={() => router.push("/journal/new")}
                className="mt-4 justify-center font-bold uppercase"
              >
                Log a Session
              </Button>
            )}
          </Section>

          {/* Webcams Preview */}
          {webcams.length > 0 && (
            <Section
              title="Live Webcams"
              divided
              action={
                <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => router.push("/cams")}>
                  See All
                </Button>
              }
            >

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
            </Section>
          )}
        </div>
      )}

      {!loading && <Footer mostRecentScrapeTimestamp={mostRecentScrapeTimestamp} />}

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
