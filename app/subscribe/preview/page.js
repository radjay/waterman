"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { MainLayout } from "../../../components/layout/MainLayout";
import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { ArrowLeft, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heading } from "../../../components/ui/Heading";
import { Text } from "../../../components/ui/Text";
import { Button } from "../../../components/ui/Button";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

function CalendarPreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadCalendar() {
      try {
        const sport = searchParams.get("sport") || "wingfoil";
        const token = searchParams.get("token") || undefined;
        const spotIdsParam = searchParams.get("spotIds");
        const spotIds = spotIdsParam ? spotIdsParam.split(",") : undefined;

        const feedData = await client.query(api.calendar.getSportFeed, {
          sport,
          token,
          spotIds,
        });

        setEvents(feedData.events);
      } catch (err) {
        console.error("Error loading calendar:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadCalendar();
  }, [searchParams]);

  if (loading) {
    return (
      <MainLayout>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-ink/60">Loading calendar preview...</div>
        </div>
        <Footer />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Header />
        <div className="py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <Heading level={2} className="text-red-800 mb-2">Error</Heading>
            <Text className="text-red-600">{error}</Text>
          </div>
        </div>
        <Footer />
      </MainLayout>
    );
  }

  // Group events by date
  const eventsByDate = {};
  events.forEach((event) => {
    const date = new Date(event.timestamp);
    const dateKey = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!eventsByDate[dateKey]) {
      eventsByDate[dateKey] = [];
    }
    eventsByDate[dateKey].push(event);
  });

  return (
    <MainLayout>
      <Header />
      <div className="py-8">
        {/* Back button */}
        <Button variant="ghost" icon={ArrowLeft} onClick={() => router.push("/subscribe")} className="mb-6">Back to Subscribe</Button>

        {/* Header */}
        <div className="mb-8">
          <Heading level={1} className="mb-2">
            Calendar Preview
          </Heading>
          <Text variant="muted">
            {events.length} event{events.length !== 1 ? "s" : ""} in your calendar feed
          </Text>
        </div>

        {/* Events */}
        {events.length === 0 ? (
          <div className="bg-white border border-ink/20 rounded-lg p-6 text-center">
            <Calendar className="w-12 h-12 text-ink/30 mx-auto mb-4" />
            <Text variant="muted">
              No events found. Make sure you have forecast data with scores ≥ 75.
            </Text>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(eventsByDate).map(([dateKey, dayEvents]) => (
              <div key={dateKey} className="bg-white border border-ink/20 rounded-lg p-6">
                <Heading level={2} className="mb-4 border-b border-ink/10 pb-2">
                  {dateKey}
                </Heading>
                <div className="space-y-4">
                  {dayEvents.map((event) => {
                    const startTime = new Date(event.timestamp);
                    const endTime = new Date(event.timestamp + 90 * 60 * 1000); // 1.5 hours
                    return (
                      <div
                        key={`${event.spotId}-${event.timestamp}`}
                        className="border-l-4 border-blue-500 pl-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-ink text-lg">
                              {event.spotName}
                            </h3>
                            <Text variant="muted" className="text-sm">
                              {startTime.toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}{" "}
                              -{" "}
                              {endTime.toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </Text>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">
                              {event.score}
                            </div>
                            <div className="text-xs text-ink/60">/ 100</div>
                          </div>
                        </div>
                        <div className="text-sm text-ink/70 mb-2">
                          <div>
                            <strong>Wind:</strong> {event.conditions.speed} kn
                            {event.conditions.gust && ` (${event.conditions.gust}*)`}
                          </div>
                          <div>
                            <strong>Direction:</strong> {event.conditions.direction}°
                          </div>
                          {event.conditions.waveHeight !== undefined && (
                            <div>
                              <strong>Waves:</strong> {event.conditions.waveHeight}m
                              {event.conditions.wavePeriod && ` @ ${event.conditions.wavePeriod}s`}
                            </div>
                          )}
                        </div>
                        <Text variant="muted" className="text-sm italic mt-2">
                          {event.reasoning}
                        </Text>
                        <Link
                          href={`/${event.sport}/best`}
                          className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                        >
                          View forecast →
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </MainLayout>
  );
}

export default function CalendarPreviewPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-ink/60">Loading...</div>
        </div>
        <Footer />
      </MainLayout>
    }>
      <CalendarPreviewContent />
    </Suspense>
  );
}
