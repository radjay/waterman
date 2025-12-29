"use client";

import { useState, useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { useToast } from "../../../components/admin/ToastProvider";

export default function Operations() {
  const [spots, setSpots] = useState([]);
  const [selectedSpots, setSelectedSpots] = useState([]);
  const [operation, setOperation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    const fetchSpots = async () => {
      try {
        const sessionToken = localStorage.getItem("admin_session_token");
        if (!sessionToken) return;

        const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
        const data = await client.query(api.admin.listSpots, { sessionToken });
        setSpots(data);
      } catch (err) {
        setError(err.message || "Failed to load spots");
      }
    };

    fetchSpots();
  }, []);

  const handleScrape = async () => {
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const sessionToken = localStorage.getItem("admin_session_token");
      if (!sessionToken) {
        setError("Not authenticated");
        return;
      }

      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
      const result = await client.action(api.admin.triggerScrape, {
        sessionToken,
        spotIds: selectedSpots.length > 0 ? selectedSpots : undefined,
      });

      setResults(result);
      setOperation("scrape");
      showToast(`Scrape completed: ${result.successful}/${result.total} successful`);
    } catch (err) {
      setError(err.message || "Failed to trigger scrape");
      showToast(`Error: ${err.message || "Failed to trigger scrape"}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleScoring = async () => {
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const sessionToken = localStorage.getItem("admin_session_token");
      if (!sessionToken) {
        setError("Not authenticated");
        return;
      }

      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
      const result = await client.action(api.admin.triggerScoring, {
        sessionToken,
        spotIds: selectedSpots.length > 0 ? selectedSpots : undefined,
      });

      setResults(result);
      setOperation("scoring");
      showToast(`Scoring completed: ${result.successful}/${result.total} successful`);
    } catch (err) {
      setError(err.message || "Failed to trigger scoring");
      showToast(`Error: ${err.message || "Failed to trigger scoring"}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAllToPortugal = async () => {
    if (!confirm("Are you sure you want to update all spots to Portugal? This cannot be undone.")) {
      return;
    }

    setLoading(true);
    setError("");
    setResults(null);

    try {
      const sessionToken = localStorage.getItem("admin_session_token");
      if (!sessionToken) {
        setError("Not authenticated");
        return;
      }

      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
      const result = await client.mutation(api.admin.updateAllSpotsToPortugal, {
        sessionToken,
      });

      setResults({ total: result.total, successful: result.updated, failed: 0 });
      setOperation("updatePortugal");
      showToast(`Updated ${result.updated} spots to Portugal`);
    } catch (err) {
      setError(err.message || "Failed to update spots");
      showToast(`Error: ${err.message || "Failed to update spots"}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleSpot = (spotId) => {
    setSelectedSpots((prev) =>
      prev.includes(spotId)
        ? prev.filter((id) => id !== spotId)
        : [...prev, spotId]
    );
  };

  const selectAll = () => {
    setSelectedSpots(spots.map((s) => s._id));
  };

  const selectNone = () => {
    setSelectedSpots([]);
  };

  return (
    <div>
      <ToastContainer />
      <h1 className="text-3xl font-bold mb-8">Operations</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Update All to Portugal */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Update All Spots</h2>
          <p className="text-ink/70 mb-4">
            Update all spots to have country = "Portugal".
          </p>

          <button
            onClick={handleUpdateAllToPortugal}
            disabled={loading}
            className="w-full bg-ink text-white py-2 px-4 rounded-md hover:bg-ink/90 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update All Spots to Portugal"}
          </button>
        </div>

        {/* Trigger Scrape */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Trigger Scrape</h2>
          <p className="text-ink/70 mb-4">
            Scrape forecast data from Windy.app for selected spots or all spots.
          </p>

          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium">Select Spots</label>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-sm text-ink/70 hover:text-ink"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={selectNone}
                  className="text-sm text-ink/70 hover:text-ink"
                >
                  Select None
                </button>
              </div>
            </div>
            <div className="border border-ink/30 rounded-md p-4 max-h-64 overflow-y-auto">
              {spots.length === 0 ? (
                <div className="text-ink/70">No spots available</div>
              ) : (
                <div className="space-y-2">
                  {spots.map((spot) => (
                    <label key={spot._id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedSpots.includes(spot._id)}
                        onChange={() => toggleSpot(spot._id)}
                        className="mr-2"
                      />
                      <span>{spot.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {selectedSpots.length === 0 && (
              <p className="text-sm text-ink/70 mt-2">
                No spots selected - will scrape all spots
              </p>
            )}
          </div>

          <button
            onClick={handleScrape}
            disabled={loading}
            className="w-full bg-ink text-white py-2 px-4 rounded-md hover:bg-ink/90 disabled:opacity-50"
          >
            {loading ? "Scraping..." : "Trigger Scrape"}
          </button>
        </div>

        {/* Trigger Scoring */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Trigger Scoring</h2>
          <p className="text-ink/70 mb-4">
            Score unscored forecast slots for selected spots or all spots.
          </p>

          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium">Select Spots (Optional)</label>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-sm text-ink/70 hover:text-ink"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={selectNone}
                  className="text-sm text-ink/70 hover:text-ink"
                >
                  Select None
                </button>
              </div>
            </div>
            <div className="border border-ink/30 rounded-md p-4 max-h-64 overflow-y-auto">
              {spots.length === 0 ? (
                <div className="text-ink/70">No spots available</div>
              ) : (
                <div className="space-y-2">
                  {spots.map((spot) => (
                    <label key={spot._id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedSpots.includes(spot._id)}
                        onChange={() => toggleSpot(spot._id)}
                        className="mr-2"
                      />
                      <span>{spot.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {selectedSpots.length === 0 && (
              <p className="text-sm text-ink/70 mt-2">
                No spots selected - will score all spots
              </p>
            )}
          </div>

          <button
            onClick={handleScoring}
            disabled={loading}
            className="w-full bg-ink text-white py-2 px-4 rounded-md hover:bg-ink/90 disabled:opacity-50"
          >
            {loading ? "Scoring..." : "Trigger Scoring"}
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            {operation === "scrape" ? "Scrape Results" : operation === "scoring" ? "Scoring Results" : "Update Results"}
          </h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Total:</span> {results.total}
            </div>
            <div>
              <span className="font-medium text-green-600">Successful:</span>{" "}
              {results.successful}
            </div>
            <div>
              <span className="font-medium text-red-600">Failed:</span> {results.failed}
            </div>
            {results.results && results.results.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Details:</h3>
                <div className="max-h-64 overflow-y-auto border border-ink/20 rounded p-4">
                  {results.results.map((result, idx) => (
                    <div
                      key={idx}
                      className={`py-2 border-b border-ink/10 last:border-0 ${
                        result.success ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      <div className="font-medium">{result.spotName || result.spotId}</div>
                      {result.success ? (
                        <div className="text-sm">
                          {operation === "scrape" ? (
                            <>
                              Slots: {result.slotsCount}, Tides: {result.tidesCount}
                            </>
                          ) : (
                            <>Scored successfully</>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm">Error: {result.error}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

