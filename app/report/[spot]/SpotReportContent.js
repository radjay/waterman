"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { MainLayout } from "../../../components/layout/MainLayout";
import { Header } from "../../../components/layout/Header";
import { EmptyState } from "../../../components/common/EmptyState";
import { Loader } from "../../../components/common/Loader";
import { DaySection } from "../../../components/forecast/DaySection";
import { Footer } from "../../../components/layout/Footer";
import { formatDate, formatTideTime } from "../../../lib/utils";
import {
  enrichSlots,
  filterAndSortDays,
  markIdealSlots,
  markContextualSlots,
} from "../../../lib/slots";
import {
  isDaylightSlot,
  isAfterSunset,
  isNighttimeSlot,
} from "../../../lib/daylight";
import { usePersistedState } from "../../../lib/hooks/usePersistedState";
import { useAuth, useUser } from "../../../components/auth/AuthProvider";
import { PillToggle } from "../../../components/ui/PillToggle";
import { FilterGroup } from "../../../components/ui/FilterGroup";
import { FilterBar } from "../../../components/ui/FilterBar";
import { spotFromSlug } from "../../../lib/spotSlug";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

const VALID_SPORTS = ["wingfoil", "kitesurfing", "surfing"];

/**
 * SpotReportContent — client component for /report/[spot].
 *
 * Two-phase data fetch:
 *   Phase 1: api.spots.list → resolve slug to a spot object
 *   Phase 2: api.spots.getReportData scoped to activeSport
 *
 * Sport selection priority: ?sport= URL param > localStorage > spot.sports[0]
 * OnboardingModal is intentionally omitted so share-link recipients see
 * content immediately.
 */
export default function SpotReportContent({ slug }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionToken } = useAuth();
  const user = useUser();

  // ── Phase 1: resolve slug ──────────────────────────────────────────────────
  // resolvedSpot: 'loading' | 'not-found' | SpotObject
  const [resolvedSpot, setResolvedSpot] = useState("loading");

  useEffect(() => {
    let stale = false;
    async function resolveSlug() {
      try {
        const spots = await client.query(api.spots.list, {});
        if (stale) return;
        const found = spotFromSlug(spots, slug);
        setResolvedSpot(found ?? "not-found");
      } catch (error) {
        console.error("Failed to resolve spot slug:", error);
        if (!stale) setResolvedSpot("not-found");
      }
    }
    resolveSlug();
    return () => {
      stale = true;
    };
  }, [slug]);

  // Redirect on invalid slug — never redirect while still loading
  useEffect(() => {
    if (resolvedSpot === "not-found") {
      router.push("/report");
    }
  }, [resolvedSpot, router]);

  // ── Sport selection ────────────────────────────────────────────────────────
  const targetSpot =
    resolvedSpot !== "loading" && resolvedSpot !== "not-found"
      ? resolvedSpot
      : null;

  const spotSports =
    targetSpot?.sports?.length > 0 ? targetSpot.sports : ["wingfoil"];

  const sportParam = searchParams?.get("sport") ?? null;

  const [localSelectedSport, setLocalSelectedSport] = usePersistedState(
    "waterman_selected_sport",
    "wingfoil",
    (val) => VALID_SPORTS.includes(val)
  );

  const activeSport = useMemo(() => {
    // ?sport= param takes priority if valid for this spot
    if (sportParam && spotSports.includes(sportParam)) return sportParam;
    // Persisted localStorage sport if valid for this spot
    if (spotSports.includes(localSelectedSport)) return localSelectedSport;
    // Fall back to the spot's first supported sport
    return spotSports[0];
  }, [sportParam, spotSports, localSelectedSport]);

  const selectedSports = useMemo(() => [activeSport], [activeSport]);

  // ── Best / All filter ──────────────────────────────────────────────────────
  const [showFilter, setShowFilter] = usePersistedState(
    "waterman_show_filter",
    "best",
    (val) => val === "best" || val === "all"
  );

  // ── Phase 2: fetch report data ─────────────────────────────────────────────
  const [allSlots, setAllSlots] = useState([]);
  const [spotsMap, setSpotsMap] = useState({});
  const [tidesBySpot, setTidesBySpot] = useState({});
  const [mostRecentScrapeTimestamp, setMostRecentScrapeTimestamp] =
    useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetSpot) return;
    let stale = false;

    async function fetchData() {
      setLoading(true);
      try {
        const usePersonalizedScores =
          user && user.showPersonalizedScores !== false;
        const reportData = await client.query(api.spots.getReportData, {
          sports: selectedSports,
          userId:
            usePersonalizedScores && user?._id ? user._id : undefined,
        });
        if (stale) return;

        const fetchedSpots = reportData.spots;
        const spotsMapObj = {};
        fetchedSpots.forEach((spot) => {
          spotsMapObj[spot._id] = spot;
        });
        setSpotsMap(spotsMapObj);

        const allFetchedSlots = [];
        const tidesBySpotObj = {};

        const spotData = reportData.data[targetSpot._id];
        if (spotData) {
          const relevantSports = spotSports.filter((s) =>
            selectedSports.includes(s)
          );
          const configs = Object.values(spotData.configs);

          if (spotData.slots) {
            const enrichedSlots = enrichSlots(
              spotData.slots,
              targetSpot,
              configs,
              spotData.scoresMap,
              relevantSports
            );
            allFetchedSlots.push(...enrichedSlots);
          }

          if (spotData.tides && spotData.tides.length > 0) {
            tidesBySpotObj[targetSpot._id] = {
              spotName: targetSpot.name,
              tides: spotData.tides.map((tide) => ({
                time: tide.time,
                type: tide.type,
                height: tide.height,
                timeStr: formatTideTime(new Date(tide.time)),
              })),
            };
          }
        }

        setAllSlots(allFetchedSlots);
        setTidesBySpot(tidesBySpotObj);
        setMostRecentScrapeTimestamp(reportData.mostRecentScrapeTimestamp);
      } catch (error) {
        console.error("Error fetching spot report data:", error);
      } finally {
        if (!stale) setLoading(false);
      }
    }

    fetchData();
    return () => {
      stale = true;
    };
  }, [targetSpot?._id, selectedSports, user]);

  // ── Data pipeline (mirrors HomeContent) ───────────────────────────────────

  const filteredSlots =
    showFilter === "best"
      ? allSlots.filter((slot) => {
          if (slot.score && slot.score.value >= 60) return true;
          if (slot.isTideOnly) return true;
          return false;
        })
      : allSlots;

  const grouped = filteredSlots.reduce((acc, slot) => {
    const dayStr = formatDate(new Date(slot.timestamp));
    if (!acc[dayStr]) acc[dayStr] = {};
    if (slot.spotId) {
      if (!acc[dayStr][slot.spotId]) acc[dayStr][slot.spotId] = [];
      acc[dayStr][slot.spotId].push(slot);
    }
    return acc;
  }, {});

  markContextualSlots(grouped, spotsMap, selectedSports);

  const filteredGrouped = {};
  Object.keys(grouped).forEach((day) => {
    filteredGrouped[day] = {};
    Object.keys(grouped[day]).forEach((spotId) => {
      if (spotId === "_tides") {
        filteredGrouped[day][spotId] = grouped[day][spotId];
        return;
      }

      const spot = spotsMap[spotId];
      if (!spot) {
        filteredGrouped[day][spotId] = grouped[day][spotId];
        return;
      }

      const isToday = day === formatDate(new Date());
      filteredGrouped[day][spotId] = grouped[day][spotId].filter((slot) => {
        if (slot.isTideOnly) return true;
        if (isNighttimeSlot(new Date(slot.timestamp))) return false;
        if (slot.isContextual) return true;
        const isDaylight = isDaylightSlot(new Date(slot.timestamp), spot);
        const afterSunset = isAfterSunset(new Date(slot.timestamp), spot);
        return isDaylight && !afterSunset;
      });
    });
  });

  const sortedDays = filterAndSortDays(filteredGrouped);
  markIdealSlots(filteredGrouped, selectedSports, spotsMap);

  // ── Render ────────────────────────────────────────────────────────────────

  // Show loading while resolving slug or fetching data
  if (resolvedSpot === "loading" || (targetSpot && loading)) {
    return (
      <MainLayout>
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader />
        </div>
      </MainLayout>
    );
  }

  // not-found redirect is handled in useEffect above; render nothing while it fires
  if (resolvedSpot === "not-found") {
    return null;
  }

  return (
    <MainLayout>
      <Header />

      <FilterBar
        activeFilters={[
          { wingfoil: "Wing", kitesurfing: "Kite", surfing: "Surf" }[
            activeSport
          ],
          { best: "Best", all: "All" }[showFilter],
        ].filter(Boolean)}
      >
        {spotSports.length > 1 && (
          <FilterGroup label="Sport">
            <PillToggle
              name="sport"
              options={spotSports.map((s) => ({
                id: s,
                label: { wingfoil: "Wing", kitesurfing: "Kite", surfing: "Surf" }[s] ?? s,
              }))}
              value={activeSport}
              onChange={setLocalSelectedSport}
            />
          </FilterGroup>
        )}
        <FilterGroup label="Conditions">
          <PillToggle
            name="show"
            options={[
              { id: "best", label: "Best" },
              { id: "all", label: "All" },
            ]}
            value={showFilter}
            onChange={setShowFilter}
          />
        </FilterGroup>
      </FilterBar>

      {sortedDays.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-8 md:mt-2">
          {sortedDays.map((day) => (
            <DaySection
              key={day}
              id={`day-${encodeURIComponent(day)}`}
              day={day}
              spotsData={filteredGrouped[day]}
              selectedSports={selectedSports}
              spotsMap={spotsMap}
              showFilter={showFilter}
              tidesBySpot={tidesBySpot}
              isAuthenticated={!!sessionToken}
            />
          ))}
        </div>
      )}

      <Footer mostRecentScrapeTimestamp={mostRecentScrapeTimestamp} />
    </MainLayout>
  );
}
