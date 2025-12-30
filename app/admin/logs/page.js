"use client";

import { useState, useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

export default function LogsViewer() {
  const [logType, setLogType] = useState("scraping");
  const [spots, setSpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    fetchLogs();
  }, [logType, selectedSpot, startDate, endDate]);

  const fetchLogs = async () => {
    setLoading(true);
    setError("");

    try {
      const sessionToken = localStorage.getItem("admin_session_token");
      if (!sessionToken) {
        setError("Not authenticated");
        return;
      }

      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

      let data = [];
      if (logType === "scraping") {
        data = await client.query(api.admin.getScrapes, {
          sessionToken,
          spotId: selectedSpot || undefined,
          startDate: startDate ? new Date(startDate).getTime() : undefined,
          endDate: endDate ? new Date(endDate).getTime() : undefined,
          limit: 100,
        });
      } else if (logType === "scoring") {
        data = await client.query(api.admin.getScoringLogs, {
          sessionToken,
          spotId: selectedSpot || undefined,
          startDate: startDate ? new Date(startDate).getTime() : undefined,
          endDate: endDate ? new Date(endDate).getTime() : undefined,
          limit: 100,
        });
      }

      setLogs(data);
    } catch (err) {
      setError(err.message || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSpotName = (spotId) => {
    const spot = spots.find((s) => s._id === spotId);
    return spot ? spot.name : spotId;
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Logs</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Log Type</label>
            <select
              value={logType}
              onChange={(e) => setLogType(e.target.value)}
              className="w-full px-4 py-2 border border-ink/30 rounded-md"
            >
              <option value="scraping">Scraping</option>
              <option value="scoring">Scoring</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Spot</label>
            <select
              value={selectedSpot}
              onChange={(e) => setSelectedSpot(e.target.value)}
              className="w-full px-4 py-2 border border-ink/30 rounded-md"
            >
              <option value="">All Spots</option>
              {spots.map((spot) => (
                <option key={spot._id} value={spot._id}>
                  {spot.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-ink/30 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-ink/30 rounded-md"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-ink text-white rounded-md hover:bg-ink/90"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Logs Table */}
      {loading ? (
        <div>Loading logs...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-ink/20">
            <thead className="bg-ink/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider">
                  Timestamp
                </th>
                {logType === "scraping" && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider">
                      Spot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider">
                      Slots Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider">
                      Error
                    </th>
                  </>
                )}
                {logType === "scoring" && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider">
                      Spot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider">
                      Sport
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider">
                      Model
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-ink/20">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={logType === "scraping" ? 5 : 5} className="px-6 py-4 text-center text-ink/70">
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ink/70">
                      {formatTimestamp(logType === "scraping" ? log.scrapeTimestamp : log.scoredAt)}
                    </td>
                    {logType === "scraping" && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                          {getSpotName(log.spotId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-sm font-medium ${
                              log.isSuccessful ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {log.isSuccessful ? "Success" : "Failed"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink/70">
                          {log.slotsCount}
                        </td>
                        <td className="px-6 py-4 text-sm text-ink/70">
                          {log.errorMessage || "-"}
                        </td>
                      </>
                    )}
                    {logType === "scoring" && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                          {getSpotName(log.spotId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink/70 capitalize">
                          {log.sport}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                          <span className="font-medium">{log.score}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink/70">
                          {log.model || "-"}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


