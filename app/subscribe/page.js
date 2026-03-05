"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../../components/auth/AuthProvider";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { Calendar, Copy, Check, RefreshCw, Trash2, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Heading } from "../../components/ui/Heading";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function SubscribePage() {
  const router = useRouter();
  const { user, sessionToken } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [creatingFor, setCreatingFor] = useState(null);

  useEffect(() => {
    loadSubscriptions();
  }, [sessionToken]);

  const loadSubscriptions = async () => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }

    try {
      const subs = await client.query(api.calendar.getUserSubscriptions, {
        sessionToken,
      });
      setSubscriptions(subs);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (sport) => {
    if (!sessionToken) return;

    setCreatingFor(sport);
    try {
      await client.mutation(api.calendar.createSubscription, {
        sessionToken,
        sport,
      });
      await loadSubscriptions();
    } catch (error) {
      console.error("Error creating subscription:", error);
      alert("Failed to create subscription. Please try again.");
    } finally {
      setCreatingFor(null);
    }
  };

  const regenerateToken = async (subscriptionId) => {
    if (!sessionToken) return;

    try {
      await client.mutation(api.calendar.regenerateToken, {
        sessionToken,
        subscriptionId,
      });
      await loadSubscriptions();
      alert("Token regenerated successfully!");
    } catch (error) {
      console.error("Error regenerating token:", error);
      alert("Failed to regenerate token. Please try again.");
    }
  };

  const deleteSubscription = async (subscriptionId) => {
    if (!sessionToken) return;
    if (!confirm("Are you sure you want to delete this subscription?")) return;

    try {
      await client.mutation(api.calendar.deleteSubscription, {
        sessionToken,
        subscriptionId,
      });
      await loadSubscriptions();
    } catch (error) {
      console.error("Error deleting subscription:", error);
      alert("Failed to delete subscription. Please try again.");
    }
  };

  const copyToClipboard = (url, sport) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(sport);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const getPublicFeedUrl = (sport) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    return `${appUrl}/api/calendar/${sport}/feed.ics`;
  };

  const getSportSubscription = (sport) => {
    return subscriptions.find(sub => sub.sport === sport);
  };

  const sports = [
    {
      id: "wingfoil",
      name: "Wingfoiling",
      description: "Best wingfoil session each day",
      icon: "🪁",
    },
    {
      id: "surfing",
      name: "Surfing",
      description: "Best surf session each day",
      icon: "🏄",
    },
  ];

  return (
    <MainLayout>
      <Header />
      <div className="py-8">
        {/* Back to home button */}
        <Button variant="ghost" icon={ArrowLeft} onClick={() => router.push("/")} className="mb-6">Back to home</Button>

        {/* Header */}
        <div className="mb-8">
          <Heading level={1} className="mb-2">
            Subscribe to Forecast Calendars
          </Heading>
          <Text variant="muted">
            Get ideal conditions synced to your calendar app
          </Text>
        </div>

        {/* Calendar Cards */}
        <div className="space-y-4 mb-8">
          {sports.map((sport) => {
            const subscription = getSportSubscription(sport.id);
            const feedUrl = subscription?.feedUrl || getPublicFeedUrl(sport.id);
            const isPersonalized = !!subscription;

            return (
              <div
                key={sport.id}
                className="bg-white border border-ink/20 rounded-lg p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{sport.icon}</span>
                    <div>
                      <h2 className="text-xl font-bold text-ink">
                        {sport.name} Calendar
                      </h2>
                      <p className="text-sm text-ink/60">{sport.description}</p>
                      {isPersonalized && (
                        <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Personalized to your favorite spots
                        </span>
                      )}
                      {!isPersonalized && user && (
                        <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          All spots
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Feed URL */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-ink/70 mb-2">
                    Calendar Feed URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={feedUrl}
                      readOnly
                      className="flex-1 px-3 py-2 border border-ink/30 rounded bg-newsprint text-sm font-mono"
                    />
                    <Button
                      variant="secondary"
                      icon={copiedUrl === sport.id ? Check : Copy}
                      onClick={() => copyToClipboard(feedUrl, sport.id)}
                    >
                      {copiedUrl === sport.id ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Link
                    href={`/subscribe/preview?sport=${sport.id}${subscription ? `&token=${subscription.feedUrl.split('token=')[1]?.split('&')[0]}` : ''}`}
                    className="px-4 py-2 border border-ink/30 bg-newsprint hover:bg-ink/5 rounded transition-colors flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Preview Calendar
                  </Link>
                  {!subscription && user && (
                    <Button
                      variant="primary"
                      onClick={() => createSubscription(sport.id)}
                      disabled={creatingFor === sport.id}
                    >
                      {creatingFor === sport.id ? "Creating..." : "Create Personalized Feed"}
                    </Button>
                  )}
                  {subscription && (
                    <>
                      <Button
                        variant="secondary"
                        icon={RefreshCw}
                        onClick={() => regenerateToken(subscription.subscriptionId)}
                      >
                        Regenerate Token
                      </Button>
                      <Button
                        variant="danger"
                        icon={Trash2}
                        onClick={() => deleteSubscription(subscription.subscriptionId)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>

                {/* Stats */}
                {subscription && (
                  <div className="mt-4 pt-4 border-t border-ink/10 text-sm text-ink/60">
                    <div className="flex gap-4">
                      <span>
                        Created: {new Date(subscription.createdAt).toLocaleDateString()}
                      </span>
                      {subscription.lastAccessedAt && (
                        <span>
                          Last accessed: {new Date(subscription.lastAccessedAt).toLocaleDateString()}
                        </span>
                      )}
                      {subscription.accessCount !== undefined && (
                        <span>
                          {subscription.accessCount} accesses
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sign in prompt for anonymous users */}
        {!user && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <Heading level={3} className="mb-2">Want personalized feeds?</Heading>
            <Text variant="muted" className="mb-4">
              Sign in to get calendar feeds filtered to your favorite spots only.
            </Text>
            <Button variant="primary" onClick={() => router.push("/auth/login")}>
              Sign In
            </Button>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white border border-ink/20 rounded-lg p-6">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full flex items-center justify-between text-left"
          >
            <Heading level={3}>How to Subscribe</Heading>
            {showInstructions ? (
              <ChevronUp className="w-5 h-5 text-ink/60" />
            ) : (
              <ChevronDown className="w-5 h-5 text-ink/60" />
            )}
          </button>

          {showInstructions && (
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="font-semibold text-ink mb-2">Google Calendar</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-ink/70">
                  <li>Click the + next to "Other calendars"</li>
                  <li>Select "From URL"</li>
                  <li>Paste your feed URL</li>
                  <li>Click "Add calendar"</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-ink mb-2">Apple Calendar</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-ink/70">
                  <li>Open Calendar app</li>
                  <li>Go to File → New Calendar Subscription</li>
                  <li>Paste your feed URL</li>
                  <li>Set auto-refresh to 1 hour</li>
                  <li>Click Subscribe</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-ink mb-2">Outlook</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-ink/70">
                  <li>Click "Add calendar"</li>
                  <li>Select "Subscribe from web"</li>
                  <li>Paste your feed URL</li>
                  <li>Click Import</li>
                </ol>
              </div>

              <div className="pt-4 border-t border-ink/10">
                <p className="text-sm text-ink/60">
                  <strong>Note:</strong> Calendar apps typically update subscribed calendars every 1-24 hours.
                  Events show the best conditions (score ≥75) for the next 7 days, with a maximum of 2 events per day.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </MainLayout>
  );
}
