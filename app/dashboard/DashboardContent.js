"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { Plus, ArrowRight, Calendar } from "lucide-react";
import { Loader } from "../../components/common/Loader";
import { Heading } from "../../components/ui/Heading";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { Section } from "../../components/ui/Section";
import { useAuth, useUser } from "../../components/auth/AuthProvider";
import { formatDate, formatTime, formatFullDay } from "../../lib/utils";
import { ScoreCard } from "../../components/ui/ScoreCard";
import { ScorePill } from "../../components/ui/ScorePill";
import { ConditionLine } from "../../components/ui/ConditionLine";
import { enrichSlots } from "../../lib/slots";
import { isDaylightSlot, isAfterSunset, isNighttimeSlot } from "../../lib/daylight";
import { WebcamCard } from "../../components/webcam/WebcamCard";
import { WebcamFullscreen } from "../../components/webcam/WebcamFullscreen";
import { useOnboarding } from "../../hooks/useOnboarding";
import { OnboardingFooter } from "../../components/onboarding/OnboardingFooter";
import { OnboardingModal } from "../../components/onboarding/OnboardingModal";
import { ScoreModal } from "../../components/common/ScoreModal";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// All three sports — used to enrich the server-prefetched anonymous data
const ALL_SPORTS = ["wingfoil", "kitesurfing", "surfing"];

// ---------------------------------------------------------------------------
// Helpers for initializing state from server-prefetched data
// ---------------------------------------------------------------------------

function buildInitialSpotsMap(initialData) {
  if (!initialData) return {};
  const map = {};
  initialData.spots.forEach((spot) => { map[spot._id] = spot; });
  return map;
}

function buildInitialEnrichedSlots(initialData) {
  if (!initialData) return [];
  return initialData.spots.flatMap((spot) => {
    const spotData = initialData.data[spot._id];
    if (!spotData || !spotData.slots) return [];
    const spotSports = spot.sports?.length > 0 ? spot.sports : ["wingfoil"];
    const relevantSports = spotSports.filter((s) => ALL_SPORTS.includes(s));
    const configs = Object.values(spotData.configs);
    return enrichSlots(spotData.slots, spot, configs, spotData.scoresMap, relevantSports);
  });
}

function buildInitialWebcamSpots(initialData) {
  if (!initialData) return [];
  return initialData.spots.filter((spot) => spot.webcamUrl).slice(0, 4);
}

// ---------------------------------------------------------------------------

export default function DashboardContent({ initialData = null }) {
  const router = useRouter();
  const { sessionToken, isAuthenticated, loading: authLoading } = useAuth();
  const user = useUser();

  const { needsOnboarding, showFooter, isLoading: onboardingLoading, markOnboardingComplete, dismissFooter } = useOnboarding(user);

  const [loading, setLoading] = useState(!initialData);
  const [dataVersion, setDataVersion] = useState(0); // incremented after onboarding to trigger refetch
  const [allEnrichedSlots, setAllEnrichedSlots] = useState(() => buildInitialEnrichedSlots(initialData));
  const [webcamSpots, setWebcamSpots] = useState(() => buildInitialWebcamSpots(initialData));
  const [spotsMap, setSpotsMap] = useState(() => buildInitialSpotsMap(initialData));
  const [mostRecentScrapeTimestamp, setMostRecentScrapeTimestamp] = useState(
    () => initialData?.scrapeTimestamp ?? null
  );
  const [focusedWebcam, setFocusedWebcam] = useState(null);
  const [favoriteSpotIds, setFavoriteSpotIds] = useState(new Set());
  const [scoreModalSlot, setScoreModalSlot] = useState(null);

  const selectedSport = user?.selectedSport || "wingfoil";

  useEffect(() => {
    // Skip the very first fetch when we have pre-fetched data and no user yet.
    // When the user loads (auth resolves) or dataVersion bumps, we re-fetch
    // to get personalized / user-specific data.
    if (!user && !dataVersion && initialData) return;

    async function fetchDashboardData() {
      setLoading(true);
      try {
        // For anonymous users, read saved favorite spot IDs from localStorage
        // synchronously before the async call so we can pass them to the server.
        let localFavoriteIds = [];
        if (!user) {
          try {
            const prefs = JSON.parse(localStorage.getItem("waterman_preferences") || "{}");
            localFavoriteIds = prefs.favoriteSpots || [];
          } catch (e) { /* ignore parse errors */ }
        }

        const userSports = user?.favoriteSports?.length > 0 ? user.favoriteSports : ["wingfoil"];
        const usePersonalizedScores = user && user.showPersonalizedScores !== false;

        // Single call: server resolves which spots to show (favorites via userId,
        // explicit IDs for anonymous users, or top 10 as fallback).
        const dashboardResult = await client.query(api.spots.getDashboardData, {
          spotIds: !user && localFavoriteIds.length > 0 ? localFavoriteIds : undefined,
          sports: userSports,
          userId: usePersonalizedScores && user?._id ? user._id : undefined,
        });

        const fetchedSpots = dashboardResult.spots;
        const favIds = new Set(
          user?.favoriteSpots ?? (localFavoriteIds.length > 0 ? localFavoriteIds : [])
        );
        setFavoriteSpotIds(favIds);

        const spotsMapObj = {};
        fetchedSpots.forEach((spot) => { spotsMapObj[spot._id] = spot; });
        setSpotsMap(spotsMapObj);

        // Enrich ALL slots (not just today) for "Coming Up" section
        const enrichedSlots = fetchedSpots.flatMap((spot) => {
          const spotData = dashboardResult.data[spot._id];
          if (!spotData || !spotData.slots) return [];
          const spotSports = spot.sports && spot.sports.length > 0 ? spot.sports : ["wingfoil"];
          const relevantSports = spotSports.filter((s) => userSports.includes(s));
          const configs = Object.values(spotData.configs);
          return enrichSlots(spotData.slots, spot, configs, spotData.scoresMap, relevantSports);
        });

        setAllEnrichedSlots(enrichedSlots);

        // Webcam spots from the returned spot list
        if (favIds.size > 0) {
          setWebcamSpots(fetchedSpots.filter((spot) => favIds.has(spot._id) && spot.webcamUrl));
        } else {
          setWebcamSpots(fetchedSpots.filter((spot) => spot.webcamUrl).slice(0, 4));
        }

        setMostRecentScrapeTimestamp(dashboardResult.scrapeTimestamp);
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

  // Derive "Right Now", "Coming Up", and webcam data from enriched slots
  const { rightNowSlots, rightNowWebcams, comingUpGroups } = useMemo(() => {
    if (allEnrichedSlots.length === 0) {
      return { rightNowSlots: [], rightNowWebcams: webcamSpots.map((s) => ({ spot: s, forecastData: null })), comingUpGroups: [] };
    }

    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    // Daylight-filtered slots (no score filter)
    const daylightSlots = allEnrichedSlots.filter((slot) => {
      if (slot.isTideOnly) return false;
      if (isNighttimeSlot(new Date(slot.timestamp))) return false;
      const spot = spotsMap[slot.spotId];
      if (!spot) return false;
      if (!isDaylightSlot(new Date(slot.timestamp), spot)) return false;
      if (isAfterSunset(new Date(slot.timestamp), spot)) return false;
      return true;
    });

    // Good slots (score >= 60) for ScoreCards and Coming Up
    const goodSlots = daylightSlots.filter((slot) => slot.score && slot.score.value >= 60);

    // "Right Now" — current 3-hour window or next upcoming slot (good scores only, for ScoreCards)
    const SLOT_DURATION = 3 * 60 * 60 * 1000;
    const currentGoodSlots = goodSlots.filter((slot) => {
      const slotStart = slot.timestamp;
      const slotEnd = slotStart + SLOT_DURATION;
      return slotStart <= now && now < slotEnd;
    });

    let rightNow;
    if (currentGoodSlots.length > 0) {
      rightNow = currentGoodSlots.sort((a, b) => (b.score?.value || 0) - (a.score?.value || 0)).slice(0, 4);
    } else {
      const upcomingToday = goodSlots
        .filter((slot) => {
          const slotDate = new Date(slot.timestamp);
          slotDate.setHours(0, 0, 0, 0);
          return slotDate.getTime() === todayMs && slot.timestamp > now;
        })
        .sort((a, b) => a.timestamp - b.timestamp);
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

    // Build forecast data for webcam spots (current time window, any score)
    const currentAllSlots = daylightSlots.filter((slot) => {
      const slotStart = slot.timestamp;
      const slotEnd = slotStart + SLOT_DURATION;
      return slotStart <= now && now < slotEnd;
    });

    // Map spotId → best current slot (by score)
    const currentSlotsBySpot = {};
    for (const slot of currentAllSlots) {
      const existing = currentSlotsBySpot[slot.spotId];
      if (!existing || (slot.score?.value || 0) > (existing.score?.value || 0)) {
        currentSlotsBySpot[slot.spotId] = slot;
      }
    }

    // If no current slots, try next upcoming today
    if (Object.keys(currentSlotsBySpot).length === 0) {
      const upcomingAllToday = daylightSlots
        .filter((slot) => {
          const slotDate = new Date(slot.timestamp);
          slotDate.setHours(0, 0, 0, 0);
          return slotDate.getTime() === todayMs && slot.timestamp > now;
        })
        .sort((a, b) => a.timestamp - b.timestamp);

      if (upcomingAllToday.length > 0) {
        const nextTimestamp = upcomingAllToday[0].timestamp;
        for (const slot of upcomingAllToday.filter((s) => s.timestamp === nextTimestamp)) {
          const existing = currentSlotsBySpot[slot.spotId];
          if (!existing || (slot.score?.value || 0) > (existing.score?.value || 0)) {
            currentSlotsBySpot[slot.spotId] = slot;
          }
        }
      }
    }

    // Build webcam cards with forecast data, only for spots with good conditions (score >= 60)
    const webcamCards = webcamSpots
      .filter((spot) => {
        const slot = currentSlotsBySpot[spot._id];
        return slot && slot.score && slot.score.value >= 60;
      })
      .map((spot) => {
        const slot = currentSlotsBySpot[spot._id];
        return {
          spot,
          slot,
          forecastData: {
            score: slot.score?.value,
            speed: slot.speed,
            gust: slot.gust,
            direction: slot.direction,
            waveHeight: slot.waveHeight,
            wavePeriod: slot.wavePeriod,
            sport: slot.sport,
            timestamp: slot.timestamp,
          },
        };
      })
      .sort((a, b) => (b.forecastData.score || 0) - (a.forecastData.score || 0));

    // Filter rightNow ScoreCards to exclude spots already shown as webcams
    const webcamSpotIds = new Set(webcamSpots.map((s) => s._id));
    const rightNowNonWebcam = rightNow.filter((slot) => !webcamSpotIds.has(slot.spotId));

    // "Coming Up" — good conditions in the next few days
    const rightNowKeys = new Set(rightNow.map((s) => `${s.spotId}-${s.timestamp}`));
    const futureSlots = goodSlots
      .filter((slot) => {
        if (slot.timestamp <= now) return false;
        if (rightNowKeys.has(`${slot.spotId}-${slot.timestamp}`)) return false;
        return true;
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    const dayGroups = {};
    for (const slot of futureSlots) {
      const dayKey = formatFullDay(new Date(slot.timestamp));
      if (!dayGroups[dayKey]) {
        dayGroups[dayKey] = [];
      }
      dayGroups[dayKey].push(slot);
    }

    const comingUp = Object.entries(dayGroups)
      .slice(0, 3)
      .map(([day, slots]) => ({
        day,
        slots: slots
          .sort((a, b) => (b.score?.value || 0) - (a.score?.value || 0))
          .slice(0, 3),
      }));

    return { rightNowSlots: rightNowNonWebcam, rightNowWebcams: webcamCards, comingUpGroups: comingUp };
  }, [allEnrichedSlots, spotsMap, webcamSpots, favoriteSpotIds]);

  const handleWebcamClick = (webcam) => setFocusedWebcam(webcam);
  const handleCloseFullscreen = () => setFocusedWebcam(null);
  const handleNavigateWebcam = (webcam) => setFocusedWebcam(webcam);

  // Helper to determine if "Right Now" shows current or next-up slots
  const hasAnyRightNowContent = rightNowSlots.length > 0 || rightNowWebcams.length > 0;
  const firstSlotTimestamp = rightNowSlots[0]?.timestamp || rightNowWebcams[0]?.forecastData?.timestamp;
  const isShowingCurrentSlots = hasAnyRightNowContent && firstSlotTimestamp && firstSlotTimestamp <= Date.now();

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
              {!hasAnyRightNowContent ? (
                <Text variant="muted" className="text-sm py-4">No good conditions forecast for today</Text>
              ) : (
                <div className="space-y-4">
                  {/* Webcam cards with live + forecast data */}
                  {rightNowWebcams.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {rightNowWebcams.map(({ spot, slot, forecastData }) => (
                        <div
                          key={spot._id}
                          onClick={() => handleWebcamClick(spot)}
                          className="cursor-pointer group"
                        >
                          <WebcamCard spot={spot} showHoverButtons forecastData={forecastData} onScoreClick={slot?.score ? () => setScoreModalSlot(slot) : undefined} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Non-webcam spots with good scores */}
                  {rightNowSlots.length > 0 && (
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
                                <span className="font-bold text-ink truncate block">{spot.name}</span>
                                <div className="flex items-center gap-1.5 font-data text-xs text-faded-ink whitespace-nowrap overflow-hidden">
                                  <span className="font-bold text-ink/80">{formatTime(new Date(slot.timestamp))}</span>
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
                              <ScorePill score={slot.score?.value} sport={slot.sport} size="lg" onClick={(e) => { e.stopPropagation(); setScoreModalSlot(slot); }} />
                            </div>
                          </ScoreCard>
                        );
                      })}
                    </div>
                  )}
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
                                  <span className="font-bold text-ink truncate block">{spot.name}</span>
                                  <div className="flex items-center gap-1.5 font-data text-xs text-faded-ink whitespace-nowrap overflow-hidden">
                                    <span className="font-bold text-ink/80">{formatTime(new Date(slot.timestamp))}</span>
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
                                <ScorePill score={slot.score?.value} sport={slot.sport} size="lg" onClick={(e) => { e.stopPropagation(); setScoreModalSlot(slot); }} />
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

          </div>
        )}

        {!loading && <Footer mostRecentScrapeTimestamp={mostRecentScrapeTimestamp} />}

        {focusedWebcam && (
          <WebcamFullscreen
            spot={focusedWebcam}
            onClose={handleCloseFullscreen}
            allWebcams={rightNowWebcams.map((w) => w.spot)}
            onNavigate={handleNavigateWebcam}
          />
        )}

        {scoreModalSlot && scoreModalSlot.score && (
          <ScoreModal
            isOpen={true}
            onClose={() => setScoreModalSlot(null)}
            score={scoreModalSlot.score}
            slot={scoreModalSlot}
            spotName={spotsMap[scoreModalSlot.spotId]?.name || ""}
          />
        )}
      </MainLayout>

      {!authLoading && !onboardingLoading && showFooter && <OnboardingFooter onDismiss={dismissFooter} />}
    </>
  );
}
