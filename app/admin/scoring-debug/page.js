"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Wind, Waves, ArrowUp, Clock, ChevronDown, ChevronUp, X, Copy, Check, BookOpen, Star } from "lucide-react";
import { getDisplayWindDirection, getCardinalDirection } from "../../../lib/utils";

// Reusable component for copyable IDs with truncation
function CopyableId({ id, label }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async (e) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="group inline-flex items-center gap-1.5">
      {label && <span className="text-xs text-ink/50">{label}:</span>}
      <span 
        className="font-mono text-xs text-ink/60 max-w-[80px] truncate" 
        title={id}
      >
        {id}
      </span>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-ink/10 rounded"
        title="Copy ID"
      >
        {copied ? (
          <Check className="w-3 h-3 text-green-600" />
        ) : (
          <Copy className="w-3 h-3 text-ink/50" />
        )}
      </button>
    </div>
  );
}

function ScoringDebugContent() {
  const searchParams = useSearchParams();
  const spotIdParam = searchParams?.get("spot");
  const sportParam = searchParams?.get("sport");

  const [sport, setSport] = useState(sportParam || "wingfoil");
  const [spotId, setSpotId] = useState(spotIdParam || "");
  const [userId, setUserId] = useState(null); // null = system scores
  const [spots, setSpots] = useState([]);
  const [users, setUsers] = useState([]);
  const [debugData, setDebugData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [loadingLog, setLoadingLog] = useState(false);

  // Fetch spots and users on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const sessionToken = localStorage.getItem("admin_session_token");
        if (!sessionToken) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

        // Fetch spots
        const spotsData = await client.query(api.admin.listSpots, { sessionToken });
        const forecastSpots = spotsData.filter(s => !s.webcamOnly);
        setSpots(forecastSpots);

        // Fetch users with personalized scores
        const usersData = await client.query(api.admin.getUsersWithPersonalizedScores, {
          sessionToken,
        });
        setUsers(usersData);

        // Set default spot if not provided
        if (!spotIdParam && forecastSpots.length > 0) {
          setSpotId(forecastSpots[0]._id);
        }
      } catch (err) {
        setError(err.message || "Failed to load initial data");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [spotIdParam]);

  // Fetch debug data when filters change
  useEffect(() => {
    if (!spotId) return;
    
    const fetchDebugData = async () => {
      setLoading(true);
      setError("");

      try {
        const sessionToken = localStorage.getItem("admin_session_token");
        if (!sessionToken) {
          setError("Not authenticated");
          return;
        }

        const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

        const data = await client.query(api.admin.getScoringDebugData, {
          sessionToken,
          spotId,
          sport,
          userId,
        });

        setDebugData(data);
      } catch (err) {
        setError(err.message || "Failed to load scoring data");
      } finally {
        setLoading(false);
      }
    };

    fetchDebugData();
  }, [spotId, sport, userId]);

  // Fetch scoring log for modal
  const handleViewLog = async (scoringLogId) => {
    if (!scoringLogId) return;

    setLoadingLog(true);
    setLogModalOpen(true);

    try {
      const sessionToken = localStorage.getItem("admin_session_token");
      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

      const log = await client.query(api.admin.getScoringLog, {
        sessionToken,
        scoringLogId,
      });

      setSelectedLog(log);
    } catch (err) {
      console.error("Failed to load scoring log:", err);
    } finally {
      setLoadingLog(false);
    }
  };

  // Group slots by day
  const groupSlotsByDay = (slots) => {
    if (!slots || slots.length === 0) return {};

    const groups = {};
    for (const item of slots) {
      const date = new Date(item.slot.timestamp);
      const dayKey = date.toISOString().split("T")[0];
      const dayLabel = date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });

      if (!groups[dayKey]) {
        groups[dayKey] = { label: dayLabel, slots: [] };
      }
      groups[dayKey].slots.push(item);
    }

    return groups;
  };

  // Auto-scroll to current time slot when data loads
  useEffect(() => {
    if (debugData && debugData.slots.length > 0) {
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        const now = Date.now();
        // Find the slot closest to current time
        let closestSlot = null;
        let closestDiff = Infinity;
        
        for (const item of debugData.slots) {
          const diff = Math.abs(item.slot.timestamp - now);
          if (diff < closestDiff) {
            closestDiff = diff;
            closestSlot = item.slot._id;
          }
        }
        
        if (closestSlot) {
          // Find the element with this slot ID and scroll to it
          const element = document.querySelector(`[data-slot-id="${closestSlot}"]`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
    }
  }, [debugData]);

  if (loading && !debugData) {
    return <div className="p-4">Loading...</div>;
  }

  const groupedSlots = debugData ? groupSlotsByDay(debugData.slots) : {};

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Scoring Debug</h1>

      {/* Filters - Sticky at top */}
      <div className="bg-white rounded-lg shadow p-6 mb-6 sticky top-3 z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Sport</label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full px-4 py-2 border border-ink/30 rounded-md"
            >
              <option value="wingfoil">Wingfoil</option>
              <option value="surfing">Surfing</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Spot</label>
            <select
              value={spotId}
              onChange={(e) => setSpotId(e.target.value)}
              className="w-full px-4 py-2 border border-ink/30 rounded-md"
            >
              {spots.map((spot) => (
                <option key={spot._id} value={spot._id}>
                  {spot.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">User</label>
            <select
              value={userId || ""}
              onChange={(e) => setUserId(e.target.value || null)}
              className="w-full px-4 py-2 border border-ink/30 rounded-md"
            >
              <option value="">System (Default)</option>
              {users.map((user) => (
                <option key={user.userId} value={user.userId}>
                  {user.email} {user.name ? `(${user.name})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Debug Data */}
      {loading ? (
        <div className="text-center py-8">Loading scoring data...</div>
      ) : (
        <div className="space-y-8">
          {Object.keys(groupedSlots).length === 0 ? (
            <div className="text-center py-8 text-ink/70">
              No forecast slots found. Run a scrape to generate data.
            </div>
          ) : (
            Object.entries(groupedSlots).map(([dayKey, { label, slots }]) => (
              <div key={dayKey}>
                <h2 className="text-xl font-semibold mb-4">{label}</h2>
                <div className="space-y-4">
                  {slots.map((item) => (
                    <SlotCard
                      key={item.slot._id}
                      item={item}
                      sport={sport}
                      onViewLog={handleViewLog}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Provenance Modal */}
      {logModalOpen && (
        <ProvenanceModal
          log={selectedLog}
          loading={loadingLog}
          onClose={() => {
            setLogModalOpen(false);
            setSelectedLog(null);
          }}
        />
      )}
    </div>
  );
}

function SlotCard({ item, sport, onViewLog }) {
  const { slot, score, scoringLogId, journalEntries = [] } = item;
  const [expanded, setExpanded] = useState(false);

  const time = new Date(slot.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isPast = slot.timestamp < Date.now();
  const isIdeal = score && score.score >= 75;
  const isEpic = score && score.score >= 90;

  return (
    <div 
      data-slot-id={slot._id}
      className={`bg-white rounded-lg shadow overflow-hidden ${isPast ? "opacity-75" : ""}`}
    >
      {/* Header - always visible */}
      <div
        className="p-4 cursor-pointer hover:bg-ink/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`text-lg font-semibold w-20 ${isPast ? "text-ink/60" : ""}`}>{time}</div>
              {isPast && (
                <span className="px-1.5 py-0.5 bg-ink/10 text-ink/60 text-xs rounded">PAST</span>
              )}
              {journalEntries.length > 0 && (
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {journalEntries.length}
                </span>
              )}
            </div>

            {/* Weather Data Summary */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1">
                <Wind className="w-4 h-4 text-ink/50" />
                <span className="font-medium">{slot.speed}</span>
                <span className="text-ink/50">kts</span>
                <ArrowUp
                  className="w-3 h-3 text-ink/50"
                  style={{ transform: `rotate(${slot.direction}deg)` }}
                />
                <span className="text-ink/50">{getDisplayWindDirection(slot.direction)}</span>
              </div>

              {slot.waveHeight !== undefined && (
                <div className="flex items-center gap-1">
                  <Waves className="w-4 h-4 text-ink/50" />
                  <span className="font-medium">{slot.waveHeight}</span>
                  <span className="text-ink/50">m</span>
                  {slot.wavePeriod !== undefined && (
                    <>
                      <span className="text-ink/50">@</span>
                      <span className="font-medium">{slot.wavePeriod}</span>
                      <span className="text-ink/50">s</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Score Badge */}
          <div className="flex items-center gap-4">
            {score ? (
              <div className="flex items-center gap-2">
                <div
                  className={`text-2xl font-bold ${
                    isEpic
                      ? "text-purple-600"
                      : isIdeal
                      ? "text-green-600"
                      : score.score >= 60
                      ? "text-yellow-600"
                      : "text-ink/50"
                  }`}
                >
                  {score.score}
                </div>
                {isEpic && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                    EPIC
                  </span>
                )}
                {isIdeal && !isEpic && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                    IDEAL
                  </span>
                )}
              </div>
            ) : (
              <span className="text-ink/50 text-sm">No score</span>
            )}

            {expanded ? (
              <ChevronUp className="w-5 h-5 text-ink/50" />
            ) : (
              <ChevronDown className="w-5 h-5 text-ink/50" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-ink/10 p-4 bg-ink/5">
          {/* Full Weather Data */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-xs text-ink/50 uppercase">Wind Speed</div>
              <div className="font-medium">{slot.speed} knots</div>
            </div>
            <div>
              <div className="text-xs text-ink/50 uppercase">Gust</div>
              <div className="font-medium">{slot.gust} knots</div>
            </div>
            <div>
              <div className="text-xs text-ink/50 uppercase">Direction</div>
              <div className="font-medium">
                {slot.direction}° ({getDisplayWindDirection(slot.direction)})
              </div>
            </div>
            {slot.waveHeight !== undefined && (
              <>
                <div>
                  <div className="text-xs text-ink/50 uppercase">Wave Height</div>
                  <div className="font-medium">{slot.waveHeight}m</div>
                </div>
                <div>
                  <div className="text-xs text-ink/50 uppercase">Wave Period</div>
                  <div className="font-medium">{slot.wavePeriod || "-"}s</div>
                </div>
                <div>
                  <div className="text-xs text-ink/50 uppercase">Wave Direction</div>
                  <div className="font-medium">
                    {slot.waveDirection !== undefined
                      ? `${slot.waveDirection}° (${getCardinalDirection(slot.waveDirection)})`
                      : "-"}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Score Details */}
          {score && (
            <div className="border-t border-ink/10 pt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-xs text-ink/50 uppercase mb-1">Reasoning</div>
                  <p className="text-sm">{score.reasoning}</p>

                  {score.factors && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {score.factors.windQuality !== undefined && (
                        <span className="px-2 py-1 bg-white rounded text-xs">
                          Wind: {score.factors.windQuality}
                        </span>
                      )}
                      {score.factors.waveQuality !== undefined && (
                        <span className="px-2 py-1 bg-white rounded text-xs">
                          Wave: {score.factors.waveQuality}
                        </span>
                      )}
                      {score.factors.tideQuality !== undefined && (
                        <span className="px-2 py-1 bg-white rounded text-xs">
                          Tide: {score.factors.tideQuality}
                        </span>
                      )}
                      {score.factors.overallConditions !== undefined && (
                        <span className="px-2 py-1 bg-white rounded text-xs">
                          Overall: {score.factors.overallConditions}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-4 text-xs text-ink/50">
                    <span>
                      Scored at: {new Date(score.scoredAt).toLocaleString()}
                      {score.model && ` • Model: ${score.model}`}
                    </span>
                    {score._id && <CopyableId id={score._id} label="SCORE ID" />}
                  </div>
                </div>

                {/* View Log Button */}
                <div className="ml-4 flex flex-col items-end gap-2">
                  {scoringLogId ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewLog(scoringLogId);
                        }}
                        className="px-3 py-1.5 border border-ink/30 rounded-md text-xs hover:bg-ink/5 transition-colors"
                      >
                        Provenance
                      </button>
                      <CopyableId id={scoringLogId} label="LOG ID" />
                    </>
                  ) : (
                    <span className="text-xs text-ink/50">No provenance</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {!score && (
            <div className="text-center py-4 text-ink/50 text-sm">
              No score available for this slot. It may not have been scored yet.
            </div>
          )}

          {/* Journal Entries Section */}
          {journalEntries.length > 0 && (
            <div className="border-t border-ink/10 pt-4 mt-4">
              <div className="text-xs text-ink/50 uppercase mb-2 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                Journal Entries ({journalEntries.length})
              </div>
              <div className="space-y-2">
                {journalEntries.map((entry, idx) => (
                  <div key={idx} className="bg-white rounded p-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CopyableId id={entry.userId} label="User" />
                      <span className="text-ink/50">•</span>
                      <span className="text-ink/70">
                        {new Date(entry.sessionDate).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= entry.rating ? "text-yellow-500 fill-yellow-500" : "text-ink/20"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProvenanceModal({ log, loading, onClose }) {
  if (!log && !loading) return null;

  const formatTimestamp = (ts) => {
    return new Date(ts).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ink/10">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">
              {loading
                ? "Loading..."
                : `Scoring Provenance - ${log?.spotName}, ${formatTimestamp(log?.timestamp)}`}
            </h2>
            {log?._id && (
              <CopyableId id={log._id} label="LOG ID" />
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-ink/5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="text-center py-8">Loading scoring log...</div>
          ) : log ? (
            <>
              {/* Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-xs text-ink/50 uppercase">Model</div>
                  <div className="font-mono">{log.model}</div>
                </div>
                <div>
                  <div className="text-xs text-ink/50 uppercase">Temperature</div>
                  <div className="font-mono">{log.temperature}</div>
                </div>
                <div>
                  <div className="text-xs text-ink/50 uppercase">Max Tokens</div>
                  <div className="font-mono">{log.maxTokens}</div>
                </div>
                <div>
                  <div className="text-xs text-ink/50 uppercase">Duration</div>
                  <div className="font-mono">{log.durationMs ? `${log.durationMs}ms` : "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-ink/50 uppercase">Attempt</div>
                  <div className="font-mono">{log.attempt || 1}</div>
                </div>
                <div>
                  <div className="text-xs text-ink/50 uppercase">Scored At</div>
                  <div className="font-mono text-xs">{formatTimestamp(log.scoredAt)}</div>
                </div>
                <div>
                  <div className="text-xs text-ink/50 uppercase">User</div>
                  {log.userId ? (
                    <CopyableId id={log.userId} />
                  ) : (
                    <div className="font-mono">System</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-ink/50 uppercase">Sport</div>
                  <div className="font-mono capitalize">{log.sport}</div>
                </div>
                {log.scoreId && (
                  <div className="col-span-2">
                    <CopyableId id={log.scoreId} label="SCORE ID" />
                  </div>
                )}
              </div>

              {/* System Prompt */}
              <div>
                <h3 className="text-sm font-medium mb-2 uppercase text-ink/70">System Prompt</h3>
                <div className="bg-ink/5 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">{log.systemPrompt}</pre>
                </div>
              </div>

              {/* User Prompt */}
              <div>
                <h3 className="text-sm font-medium mb-2 uppercase text-ink/70">User Prompt</h3>
                <div className="bg-ink/5 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">{log.userPrompt}</pre>
                </div>
              </div>

              {/* Raw Response */}
              <div>
                <h3 className="text-sm font-medium mb-2 uppercase text-ink/70">Raw Response</h3>
                <div className="bg-ink/5 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {JSON.stringify(JSON.parse(log.rawResponse), null, 2)}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-ink/50">Failed to load log data</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-ink/10">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-ink text-white rounded-md hover:bg-ink/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ScoringDebugPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <ScoringDebugContent />
    </Suspense>
  );
}
