"use client";

import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

export default function AdminDashboard() {
  const [kpis, setKPIs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const sessionToken = localStorage.getItem("admin_session_token");
        if (!sessionToken) return;

        const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
        const data = await client.query(api.admin.getKPIs, { sessionToken });
        setKPIs(data);
      } catch (err) {
        setError(err.message || "Failed to load KPIs");
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
    // Refresh every 30 seconds
    const interval = setInterval(fetchKPIs, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div>Loading KPIs...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  if (!kpis) {
    return <div>No data available</div>;
  }

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "Never";
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Data Freshness */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Data Freshness</h2>
          <div className="space-y-2">
            <div>
              <span className="text-ink/70">Stale Spots:</span>{" "}
              <span className="font-semibold">{kpis.dataFreshness.staleSpotsCount}</span>
            </div>
            <div>
              <span className="text-ink/70">Total Spots:</span>{" "}
              <span className="font-semibold">{kpis.dataVolume.totalSpots}</span>
            </div>
          </div>
        </div>

        {/* Scraping Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Scraping (Today)</h2>
          <div className="space-y-2">
            <div>
              <span className="text-ink/70">Total:</span>{" "}
              <span className="font-semibold">{kpis.scraping.totalToday}</span>
            </div>
            <div>
              <span className="text-ink/70">Successful:</span>{" "}
              <span className="font-semibold text-green-600">
                {kpis.scraping.successfulToday}
              </span>
            </div>
            <div>
              <span className="text-ink/70">Failed:</span>{" "}
              <span className="font-semibold text-red-600">
                {kpis.scraping.failedToday}
              </span>
            </div>
            <div>
              <span className="text-ink/70">Success Rate:</span>{" "}
              <span className="font-semibold">
                {kpis.scraping.successRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Scoring Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Scoring (Today)</h2>
          <div className="space-y-2">
            <div>
              <span className="text-ink/70">Total Scores:</span>{" "}
              <span className="font-semibold">{kpis.scoring.totalToday}</span>
            </div>
          </div>
        </div>

        {/* Data Volume */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Data Volume (Last 7 Days)</h2>
          <div className="space-y-2">
            <div>
              <span className="text-ink/70">Forecast Slots:</span>{" "}
              <span className="font-semibold">{kpis.dataVolume.slotsLast7Days}</span>
            </div>
            <div>
              <span className="text-ink/70">Condition Scores:</span>{" "}
              <span className="font-semibold">{kpis.dataVolume.scoresLast7Days}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

