"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../../components/auth/AuthProvider";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { SessionCard } from "../../components/journal/SessionCard";
import { Plus, BookOpen } from "lucide-react";
import { Loader } from "../../components/common/Loader";
import { PillToggle } from "../../components/ui/PillToggle";
import { FilterGroup } from "../../components/ui/FilterGroup";
import { FilterBar } from "../../components/ui/FilterBar";
import { Heading } from "../../components/ui/Heading";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";

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

  if (!sessionToken) {
    return null;
  }

  return (
    <MainLayout>
      <Header />

      <div className="pt-1" />

      {/* Filters + action */}
      <FilterBar
        activeFilters={[
          { "": "All", wingfoil: "Wing", kitesurfing: "Kite", surfing: "Surf" }[selectedSport],
        ].filter(Boolean)}
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => router.push("/journal/new")}>New Session</Button>
        }
      >
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
      </FilterBar>

      {/* Content area */}
      <div className="pb-12">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <Loader />
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-ink/30 mx-auto mb-4" />
            <Heading level={2}>No sessions yet</Heading>
            <Text variant="muted">Log your first session to start tracking your progress</Text>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => router.push("/journal/new")} className="mx-auto">Log Session</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <SessionCard key={entry._id} entry={entry} />
            ))}
          </div>
        )}
      </div>
      {!loading && <Footer />}
    </MainLayout>
  );
}
