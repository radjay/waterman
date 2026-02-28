"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../../components/auth/AuthProvider";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { ViewToggle } from "../../components/layout/ViewToggle";
import { Footer } from "../../components/layout/Footer";
import { SessionCard } from "../../components/journal/SessionCard";
import { Loader2, Plus, BookOpen } from "lucide-react";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function JournalPage() {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSport, setSelectedSport] = useState(""); // Empty = all sports

  useEffect(() => {
    if (!sessionToken) {
      router.push("/auth/login");
      return;
    }

    async function fetchEntries() {
      setLoading(true);
      setError("");
      try {
        const result = await client.query(api.journal.listEntries, {
          sessionToken,
          sport: selectedSport || undefined,
          limit: 50,
        });
        setEntries(result.entries);
      } catch (err) {
        console.error("Error loading entries:", err);
        setError(err.message || "Failed to load journal entries");
      } finally {
        setLoading(false);
      }
    }

    fetchEntries();
  }, [sessionToken, selectedSport, router]);

  // Handle view toggle - navigate to different views
  const handleViewChange = (view) => {
    if (view === "list") {
      router.push("/");
    } else if (view === "calendar") {
      router.push("/calendar");
    } else if (view === "cams") {
      router.push("/cams");
    }
  };

  if (!sessionToken) {
    return null;
  }

  return (
    <MainLayout>
      <Header />
      {/* Tabs bar - sticky on mobile and desktop */}
      <div className="sticky top-[57px] z-40 bg-newsprint border-b border-ink/20 py-3 md:py-4">
        <div className="flex items-center justify-between gap-2">
          <ViewToggle onChange={handleViewChange} />
        </div>
      </div>
      <div className="h-4" /> {/* Spacer below tabs */}

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold text-ink">Session Journal</h1>
          <button
            onClick={() => router.push("/journal/new")}
            className="flex items-center gap-2 px-4 py-2 bg-ink text-newsprint rounded-md hover:bg-ink/90 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Log Session
          </button>
        </div>

        {/* Sport Filter */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setSelectedSport("")}
            className={`px-4 py-2 rounded-md border-2 transition-all ${
              selectedSport === ""
                ? "border-ink bg-ink/5"
                : "border-ink/20 hover:border-ink/30"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedSport("wingfoil")}
            className={`px-4 py-2 rounded-md border-2 transition-all ${
              selectedSport === "wingfoil"
                ? "border-ink bg-ink/5"
                : "border-ink/20 hover:border-ink/30"
            }`}
          >
            Wing
          </button>
          <button
            onClick={() => setSelectedSport("kitesurfing")}
            className={`px-4 py-2 rounded-md border-2 transition-all ${
              selectedSport === "kitesurfing"
                ? "border-ink bg-ink/5"
                : "border-ink/20 hover:border-ink/30"
            }`}
          >
            Kite
          </button>
          <button
            onClick={() => setSelectedSport("surfing")}
            className={`px-4 py-2 rounded-md border-2 transition-all ${
              selectedSport === "surfing"
                ? "border-ink bg-ink/5"
                : "border-ink/20 hover:border-ink/30"
            }`}
          >
            Surf
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-ink/60 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-ink/30 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-ink mb-2">
              Your session journal is empty
            </h2>
            <p className="text-ink/60 mb-6">
              After your next session, come here to log it and track your progress!
            </p>
            <button
              onClick={() => router.push("/journal/new")}
              className="px-4 py-2 bg-ink text-newsprint rounded-md hover:bg-ink/90 transition-colors font-medium"
            >
              Log Your First Session
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <SessionCard key={entry._id} entry={entry} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </MainLayout>
  );
}
