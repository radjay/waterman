"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { Plus, ArrowRight, Clock, Calendar } from "lucide-react";
import { Loader } from "../../components/common/Loader";
import { Heading } from "../../components/ui/Heading";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { Section } from "../../components/ui/Section";
import { useAuth, useUser } from "../../components/auth/AuthProvider";
import { formatDate, formatTime, formatFullDay } from "../../lib/utils";
import { ScoreCard } from "../../components/ui/ScoreCard";
import { ScoreDisplay } from "../../components/ui/ScoreDisplay";
import { SportBadge } from "../../components/ui/SportBadge";
import { ConditionLine } from "../../components/ui/ConditionLine";
import { enrichSlots } from "../../lib/slots";
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

  const { needsOnboarding, showFooter, isLoading: onboardingLoading, markOnboardingComplete, dismissFooter } = useOnboarding(user);

  const [loading, setLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0); // incremented after onboarding to trigger refetch
  const [allEnrichedSlots, setAllEnrichedSlots] = useState([]);
  const [webcamSpots, setWebcamSpots] = useState([]);
  const [spotsMap, setSpotsMap] = useState({});
  const [mostRecentScrapeTimestamp, setMostRecentScrapeTimestamp] = useState(null);
  const [focusedWebcam, setFocusedWebcam] = useState(null);
  const [favoriteSpotIds, setFavoriteSpotIds] = useState(new Set());

  const selectedSport = user?.selectedSport || "wingfoil";

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const fetchedSpots = await client.query(api.spots.list, {});

        const spotsMapObj = {};
        fetchedSpots.forEach((spot) => {
          spotsMapObj[spot._id] = spot;
        });
        setSpotsMap(spotsMapObj);

        // Determine relevant spots
        let relevantSpots = fetchedSpots;
        let favIds = new Set();

        if (user && user.favoriteSpots && user.favoriteSpots.length > 0) {
          favIds = new Set(user.favoriteSpots);
          relevantSpots = fetchedSpots.filter((spot) => favIds.has(spot._id));
        } else if (!user) {
          const preferencesStr = localStorage.getItem("waterman_preferences");
          if (preferencesStr) {
            try {
              const preferences = JSON.parse(preferencesStr);
              if (preferences.favoriteSpots && preferences.favoriteSpots.length > 0) {
                favIds = new Set(preferences.favoriteSpots);
                relevantSpots = fetchedSpots.filter((spot) => favIds.has(spot._id));
              } else {
                relevantSpots = fetchedSpots.slice(0, 10);
              }
              // Sports preferences from localStorage are handled via userSports below
            } catch (e) {
              relevantSpots = fetchedSpots.slice(0, 10);
            }
          } else {
            relevantSpots = fetchedSpots.slice(0, 10);
          }
        } else {
          relevantSpots = fetchedSpots.slice(0, 10);
        }

        setFavoriteSpotIds(favIds);

        // User's sports
        const userSports = user?.favoriteSports?.length > 0 ? user.favoriteSports : ["wingfoil"];

        const allSportsSet = new Set();
        relevantSpots.forEach((spot) => {
          const spotSports = spot.sports && spot.sports.length > 0 ? spot.sports : ["wingfoil"];
          spotSports.forEach((s) => {
            if (userSports.includes(s)) allSportsSet.add(s);
          });
        });
        const allSports = [...allSportsSet];

        const usePersonalizedScores = user && user.showPersonalizedScores !== false;
        const [batchedData, scrapeTimestamp] = await Promise.all([
          client.query(api.spots.getDashboardData, {
            spotIds: relevantSpots.map((s) => s._id),
            sports: allSports,
            userId: usePersonalizedScores && user?._id ? user._id : undefined,
          }),
          client.query(api.spots.getMostRecentScrapeTimestamp),
        ]);

        // Enrich ALL slots (not just today) for "Coming Up" section
        const enrichedSlots = relevantSpots.flatMap((spot) => {
          const spotData = batchedData[spot._id];
          if (!spotData || !spotData.slots) return [];

          const spotSports = spot.sports && spot.sports.length > 0 ? spot.sports : ["wingfoil"];
          const relevantSports = spotSports.filter((s) => userSports.includes(s));
          const configs = Object.values(spotData.configs);

          return enrichSlots(spotData.slots, spot, configs, spotData.scoresMap, relevantSports);
        });

        setAllEnrichedSlots(enrichedSlots);

        // Webcam spots
        if (favIds.size > 0) {
          setWebcamSpots(fetchedSpots.filter((spot) => favIds.has(spot._id) && spot.webcamUrl));
        } else {
          setWebcamSpots(fetchedSpots.filter((spot) => spot.webcamUrl).slice(0, 4));
        }

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

  // Derive "Right Now", "Coming Up", and webcam ordering from enriched slots
  const { rightNowSlots, comingUpGroups, orderedWebcams } = useMemo(() => {
    if (allEnrichedSlots.length === 0) {
      return { rightNowSlots: [], comingUpGroups: [], orderedWebcams: webcamSpots };
    }

    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    // Filter to good daylight slots only
    const goodSlots = allEnrichedSlots.filter((slot) => {
      if (slot.isTideOnly) return false;
      if (isNighttimeSlot(new Date(slot.timestamp))) return false;
      const spot = spotsMap[slot.spotId];
      if (!spot) return false;
      if (!isDaylightSlot(new Date(slot.timestamp), spot)) return false;
      if (isAfterSunset(new Date(slot.timestamp), spot)) return false;
      return slot.score && slot.score.value >= 60;
    });

    // "Right Now" — current 3-hour window or next upcoming slot
    const SLOT_DURATION = 3 * 60 * 60 * 1000;
    const currentSlots = goodSlots.filter((slot) => {
      const slotStart = slot.timestamp;
      const slotEnd = slotStart + SLOT_DURATION;
      return slotStart <= now && now < slotEnd;
    });

    // If no current slots, show next upcoming today
    let rightNow;
    if (currentSlots.length > 0) {
      rightNow = currentSlots.sort((a, b) => (b.score?.value || 0) - (a.score?.value || 0)).slice(0, 4);
    } else {
      const upcomingToday = goodSlots
        .filter((slot) => {
          const slotDate = new Date(slot.timestamp);
          slotDate.setHours(0, 0, 0, 0);
          return slotDate.getTime() === todayMs && slot.timestamp > now;
        })
        .sort((a, b) => a.timestamp - b.timestamp);
      // Take the earliest upcoming time slot, show best spots for it
      if (upcomingToday.length > 0) {
        const nextTimestamp = upcomingToday[0].timestamp;
        rightNow = upcomingToday
          .filter((s) => s.timestamp === nextTimestamp)
          .sort((a, b) => (b.score?.value || 0) - (a.score?.value || 0))
          .slice(0, 4);
      } else {
        rightNow = [];
      }
    }

    // "Coming Up" — good conditions in the next few days (excluding slots shown in Right Now)
    const rightNowKeys = new Set(rightNow.map((s) => `${s.spotId}-${s.timestamp}`));
    const futureSlots = goodSlots
      .filter((slot) => {
        // Must be in the future
        if (slot.timestamp <= now) return false;
        // Exclude slots already shown in Right Now
        if (rightNowKeys.has(`${slot.spotId}-${slot.timestamp}`)) return false;
        return true;
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    // Group by day
    const dayGroups = {};
    for (const slot of futureSlots) {
      const dayKey = formatFullDay(new Date(slot.timestamp));
      if (!dayGroups[dayKey]) {
        dayGroups[dayKey] = [];
      }
      dayGroups[dayKey].push(slot);
    }

    // Limit: top 3 per day, max 3 days
    const comingUp = Object.entries(dayGroups)
      .slice(0, 3)
      .map(([day, slots]) => ({
        day,
        slots: slots
          .sort((a, b) => (b.score?.value || 0) - (a.score?.value || 0))
          .slice(0, 3),
      }));

    // Prioritize webcams: spots with good current conditions first, then favorites
    const spotsWithGoodNow = new Set(rightNow.map((s) => s.spotId));
    const orderedCams = [...webcamSpots].sort((a, b) => {
      const aHasGood = spotsWithGoodNow.has(a._id) ? 1 : 0;
      const bHasGood = spotsWithGoodNow.has(b._id) ? 1 : 0;
      if (aHasGood !== bHasGood) return bHasGood - aHasGood;
      const aIsFav = favoriteSpotIds.has(a._id) ? 1 : 0;
      const bIsFav = favoriteSpotIds.has(b._id) ? 1 : 0;
      return bIsFav - aIsFav;
    });

    return { rightNowSlots: rightNow, comingUpGroups: comingUp, orderedWebcams: orderedCams };
  }, [allEnrichedSlots, spotsMap, webcamSpots, favoriteSpotIds]);

  const handleWebcamClick = (webcam) => setFocusedWebcam(webcam);
  const handleCloseFullscreen = () => setFocusedWebcam(null);
  const handleNavigateWebcam = (webcam) => setFocusedWebcam(webcam);

  // Helper to determine if "Right Now" shows current or next-up slots
  const isShowingCurrentSlots = rightNowSlots.length > 0 && rightNowSlots[0].timestamp <= Date.now();

  return (
    <>
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
            {/* ── Right Now ── */}
            <Section
              title={isShowingCurrentSlots ? "Right Now" : "Next Up Today"}
              action={
                isAuthenticated ? (
                  <Button variant="ghost" size="sm" icon={Plus} onClick={() => router.push("/journal/new")}>
                    Log a Session
                  </Button>
                ) : null
              }
            >
              {rightNowSlots.length === 0 ? (
                <Text variant="muted" className="text-sm py-4">No good conditions forecast for today</Text>
              ) : (
                <div className="space-y-2">
                  {rightNowSlots.map((slot) => {
                    const spot = spotsMap[slot.spotId];
                    if (!spot) return null;

                    return (
                      <ScoreCard
                        key={`${slot.spotId}-${slot.timestamp}-${slot.sport}`}
                        score={slot.score?.value}
                        onClick={() => router.push(`/report?day=${encodeURIComponent(formatDate(new Date()))}`)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <SportBadge sport={slot.sport} size={22} />
                              <span className="font-bold text-ink truncate">{spot.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-ink/60 whitespace-nowrap overflow-hidden">
                              <span>{formatTime(new Date(slot.timestamp))}</span>
                              <span className="text-ink/30">&middot;</span>
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

            </Section>

            {/* ── Coming Up ── */}
            {comingUpGroups.length > 0 && (
              <Section
                title="Coming Up"
                action={
                  <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => router.push("/report")}>
                    Full Report
                  </Button>
                }
              >
                <div className="space-y-6">
                  {comingUpGroups.map(({ day, slots }) => (
                    <div key={day}>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar size={14} className="text-ink/40" />
                        <Text variant="label" className="text-xs">{day}</Text>
                      </div>
                      <div className="space-y-2">
                        {slots.map((slot) => {
                          const spot = spotsMap[slot.spotId];
                          if (!spot) return null;

                          return (
                            <ScoreCard
                              key={`${slot.spotId}-${slot.timestamp}-${slot.sport}`}
                              score={slot.score?.value}
                              onClick={() => router.push(`/report?day=${encodeURIComponent(day)}`)}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <SportBadge sport={slot.sport} size={22} />
                                    <span className="font-bold text-ink truncate">{spot.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-ink/60 whitespace-nowrap overflow-hidden">
                                    <span>{formatTime(new Date(slot.timestamp))}</span>
                                    <span className="text-ink/30">&middot;</span>
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
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Live Webcams ── */}
            {orderedWebcams.length > 0 && (
              <Section
                title="Live Webcams"
                action={
                  <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => router.push("/cams")}>
                    See All
                  </Button>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orderedWebcams.map((spot) => (
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

        {focusedWebcam && (
          <WebcamFullscreen
            spot={focusedWebcam}
            onClose={handleCloseFullscreen}
            allWebcams={orderedWebcams}
            onNavigate={handleNavigateWebcam}
          />
        )}
      </MainLayout>

      {!authLoading && !onboardingLoading && showFooter && <OnboardingFooter onDismiss={dismissFooter} />}
    </>
  );
}
