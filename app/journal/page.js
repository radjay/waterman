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
    if (view === "dashboard") {
      router.push("/dashboard");
    } else if (view === "list") {
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

      {/* Action bar - sport filters and new session button */}
      <div className="sticky top-[120px] z-30 bg-newsprint border-b border-ink/20 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 border border-ink/30 rounded bg-newsprint">
            <button
              onClick={() => setSelectedSport("")}
              className={`px-3 py-1.5 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                selectedSport === ""
                  ? "bg-ink text-newsprint"
                  : "text-ink hover:bg-ink/5"
              }`}
            >
              <span className="text-xs font-bold uppercase leading-none translate-y-[1.5px]">All</span>
            </button>
            <button
              onClick={() => setSelectedSport("wingfoil")}
              className={`px-3 py-1.5 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                selectedSport === "wingfoil"
                  ? "bg-ink text-newsprint"
                  : "text-ink hover:bg-ink/5"
              }`}
            >
              <span className="text-xs font-bold uppercase leading-none translate-y-[1.5px]">Wing</span>
            </button>
            <button
              onClick={() => setSelectedSport("kitesurfing")}
              className={`px-3 py-1.5 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                selectedSport === "kitesurfing"
                  ? "bg-ink text-newsprint"
                  : "text-ink hover:bg-ink/5"
              }`}
            >
              <span className="text-xs font-bold uppercase leading-none translate-y-[1.5px]">Kite</span>
            </button>
            <button
              onClick={() => setSelectedSport("surfing")}
              className={`px-3 py-1.5 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                selectedSport === "surfing"
                  ? "bg-ink text-newsprint"
                  : "text-ink hover:bg-ink/5"
              }`}
            >
              <span className="text-xs font-bold uppercase leading-none translate-y-[1.5px]">Surf</span>
            </button>
          </div>

          <button
            onClick={() => router.push("/journal/new")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-newsprint rounded hover:bg-ink/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-bold uppercase leading-none translate-y-[1.5px]">New Session</span>
          </button>
        </div>
      </div>

      <div className="h-4" /> {/* Spacer below action bar */}

      {/* Content area */}
      <div className="px-4 pb-12">
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
              No sessions yet
            </h2>
            <p className="text-ink/60 mb-6">
              Log your first session to start tracking your progress
            </p>
            <button
              onClick={() => router.push("/journal/new")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-newsprint rounded hover:bg-ink/90 transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span className="text-xs font-bold uppercase leading-none translate-y-[1.5px]">Log Session</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
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
