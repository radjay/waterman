"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "../../../components/auth/AuthProvider";
import { MainLayout } from "../../../components/layout/MainLayout";
import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { RatingDisplay } from "../../../components/journal/RatingInput";
import { DurationDisplay } from "../../../components/journal/DurationInput";
import { ForecastComparison } from "../../../components/journal/ForecastComparison";
import { LocationPicker } from "../../../components/journal/LocationPicker";
import { RatingInput } from "../../../components/journal/RatingInput";
import { DurationInput } from "../../../components/journal/DurationInput";
import { Loader2, ArrowLeft, MapPin, Clock, Trash2, Edit2, Save, X } from "lucide-react";
import { Heading } from "../../../components/ui/Heading";
import { Text } from "../../../components/ui/Text";
import { Button } from "../../../components/ui/Button";
import { SportBadge } from "../../../components/ui/SportBadge";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function JournalEntryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { sessionToken } = useAuth();
  const entryId = params?.id;

  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit form state
  const [sport, setSport] = useState("");
  const [location, setLocation] = useState(null);
  const [sessionDate, setSessionDate] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [rating, setRating] = useState(0);
  const [sessionNotes, setSessionNotes] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");

  useEffect(() => {
    if (!sessionToken || !entryId) {
      router.push("/auth/login");
      return;
    }

    async function fetchEntry() {
      setLoading(true);
      setError("");
      try {
        const result = await client.query(api.journal.getEntry, {
          sessionToken,
          entryId,
        });
        if (!result) {
          setError("Entry not found");
          return;
        }
        setEntry(result);
        
        // Initialize edit form
        setSport(result.sport);
        setLocation(
          result.spotId
            ? { type: "spot", spotId: result.spotId }
            : result.customLocation
            ? { type: "custom", location: result.customLocation }
            : null
        );
        const date = new Date(result.sessionDate);
        setSessionDate(date.toISOString().slice(0, 16));
        setDurationMinutes(result.durationMinutes);
        setRating(result.rating);
        setSessionNotes(result.sessionNotes || "");
        setConditionNotes(result.conditionNotes || "");
      } catch (err) {
        console.error("Error loading entry:", err);
        setError(err.message || "Failed to load entry");
      } finally {
        setLoading(false);
      }
    }

    fetchEntry();
  }, [sessionToken, entryId, router]);

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    // Reset to original values
    if (entry) {
      setSport(entry.sport);
      setLocation(
        entry.spotId
          ? { type: "spot", spotId: entry.spotId }
          : entry.customLocation
          ? { type: "custom", location: entry.customLocation }
          : null
      );
      const date = new Date(entry.sessionDate);
      setSessionDate(date.toISOString().slice(0, 16));
      setDurationMinutes(entry.durationMinutes);
      setRating(entry.rating);
      setSessionNotes(entry.sessionNotes || "");
      setConditionNotes(entry.conditionNotes || "");
    }
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const sessionTime = new Date(sessionDate).getTime();

      await client.mutation(api.journal.updateEntry, {
        sessionToken,
        entryId,
        sport,
        spotId: location?.type === "spot" ? location.spotId : undefined,
        customLocation: location?.type === "custom" ? location.location : undefined,
        sessionDate: sessionTime,
        durationMinutes,
        rating,
        sessionNotes: sessionNotes.trim() || undefined,
        conditionNotes: conditionNotes.trim() || undefined,
      });

      // Reload entry
      const result = await client.query(api.journal.getEntry, {
        sessionToken,
        entryId,
      });
      setEntry(result);
      setEditing(false);
    } catch (err) {
      console.error("Error updating entry:", err);
      setError(err.message || "Failed to update entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this entry? This cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      await client.mutation(api.journal.deleteEntry, {
        sessionToken,
        entryId,
      });
      router.push("/journal");
    } catch (err) {
      console.error("Error deleting entry:", err);
      setError(err.message || "Failed to delete entry");
      setDeleting(false);
    }
  };

  if (!sessionToken || !entryId) {
    return null;
  }

  if (loading) {
    return (
      <MainLayout>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 text-ink/60 animate-spin" />
        </div>
        <Footer />
      </MainLayout>
    );
  }

  if (error && !entry) {
    return (
      <MainLayout>
        <Header />
        <div className="py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
        <Footer />
      </MainLayout>
    );
  }

  if (!entry) {
    return null;
  }

  const locationName = entry.spotName || entry.customLocation || "Unknown";
  const sessionDateObj = new Date(entry.sessionDate);
  const dateStr = sessionDateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = sessionDateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const sportLabel = entry.sport === "wingfoil" ? "Wingfoiling" : "Surfing";

  return (
    <MainLayout>
      <Header />
      <div className="py-12">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => router.push("/journal")} className="mb-4">Back</Button>

        <div className="flex items-center justify-between mb-8">
          <Heading level={1}>Session Details</Heading>
          {!editing && (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={Edit2} onClick={handleEdit}>Edit</Button>
              <Button variant="danger" size="sm" icon={Trash2} onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</Button>
            </div>
          )}
        </div>

        {error && (
          <Text className="text-red-600 text-sm mb-4">{error}</Text>
        )}

        {!editing ? (
          <div className="space-y-6">
            {/* Sport Badge */}
            <div>
              <SportBadge sport={entry.sport} />
            </div>

            {/* Location */}
            <div>
              <div className="flex items-center gap-2 text-ink/70 mb-1">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">Location</span>
              </div>
              <div className="text-ink font-medium">{locationName}</div>
              {entry.spotId && (
                <button
                  onClick={() => router.push(`/${entry.sport}/${entry.spotId}`)}
                  className="text-sm text-ink/60 hover:text-ink mt-1"
                >
                  View spot details →
                </button>
              )}
            </div>

            {/* Date & Time */}
            <div>
              <div className="flex items-center gap-2 text-ink/70 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Date & Time</span>
              </div>
              <div className="text-ink">
                {dateStr} at {timeStr}
              </div>
            </div>

            {/* Duration */}
            <div>
              <div className="text-sm font-medium text-ink/70 mb-1">Duration</div>
              <DurationDisplay minutes={entry.durationMinutes} />
            </div>

            {/* Rating */}
            <div>
              <div className="text-sm font-medium text-ink/70 mb-2">Rating</div>
              <RatingDisplay value={entry.rating} />
            </div>

            {/* Session Notes */}
            {entry.sessionNotes && (
              <div>
                <div className="text-sm font-medium text-ink/70 mb-2">Session Notes</div>
                <div className="text-ink whitespace-pre-wrap bg-ink/5 rounded-md p-4">
                  {entry.sessionNotes}
                </div>
              </div>
            )}

            {/* Condition Notes */}
            {entry.conditionNotes && (
              <div>
                <div className="text-sm font-medium text-ink/70 mb-2">Conditions Notes</div>
                <div className="text-ink whitespace-pre-wrap bg-ink/5 rounded-md p-4">
                  {entry.conditionNotes}
                </div>
              </div>
            )}

            {/* Forecast Comparison */}
            {entry.spotId && (
              <div>
                <div className="text-sm font-medium text-ink/70 mb-2">
                  Forecast Comparison
                </div>
                <ForecastComparison forecastSlots={entry.forecastSlots || []} sport={entry.sport} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sport Selection */}
            <div>
              <Text variant="label" as="label" className="block mb-2">Sport</Text>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSport("wingfoil")}
                  className={`flex-1 px-4 py-3 rounded-md border-2 transition-all ${
                    sport === "wingfoil"
                      ? "border-ink bg-ink/5"
                      : "border-ink/20 hover:border-ink/30"
                  }`}
                >
                  Wingfoiling
                </button>
                <button
                  type="button"
                  onClick={() => setSport("surfing")}
                  className={`flex-1 px-4 py-3 rounded-md border-2 transition-all ${
                    sport === "surfing"
                      ? "border-ink bg-ink/5"
                      : "border-ink/20 hover:border-ink/30"
                  }`}
                >
                  Surfing
                </button>
              </div>
            </div>

            {/* Location */}
            <div>
              <Text variant="label" as="label" className="block mb-2">Location</Text>
              <LocationPicker
                sport={sport}
                value={location}
                onChange={setLocation}
                sessionToken={sessionToken}
              />
            </div>

            {/* Date & Time */}
            <div>
              <Text variant="label" as="label" className="block mb-2">Date & Time</Text>
              <input
                type="datetime-local"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full px-4 py-2 border-2 border-ink/20 rounded-md focus:outline-none focus:border-ink text-ink"
              />
            </div>

            {/* Duration */}
            <div>
              <Text variant="label" as="label" className="block mb-2">Duration</Text>
              <DurationInput value={durationMinutes} onChange={setDurationMinutes} />
            </div>

            {/* Rating */}
            <div>
              <Text variant="label" as="label" className="block mb-2">Rating</Text>
              <RatingInput value={rating} onChange={setRating} />
            </div>

            {/* Session Notes */}
            <div>
              <Text variant="label" as="label" className="block mb-2">Session Notes (optional)</Text>
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border-2 border-ink/20 rounded-md focus:outline-none focus:border-ink text-ink"
              />
            </div>

            {/* Condition Notes */}
            <div>
              <Text variant="label" as="label" className="block mb-2">Conditions Notes (optional)</Text>
              <textarea
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border-2 border-ink/20 rounded-md focus:outline-none focus:border-ink text-ink"
              />
            </div>

            {/* Note about forecast */}
            <div className="bg-ink/5 rounded-md p-4 border-2 border-ink/10">
              <div className="text-sm text-ink/70">
                <strong>Note:</strong> Forecast slot links are preserved from when you originally
                logged this session. They won't be updated when you edit.
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" size="lg" fullWidth onClick={handleCancel}>Cancel</Button>
              <Button variant="primary" size="lg" fullWidth icon={saving ? undefined : Save} loading={saving} onClick={handleSave}>{saving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </MainLayout>
  );
}
