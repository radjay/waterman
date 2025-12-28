"use client";

import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

export function SpotConfigForm({ spotId, sport, config, onSave }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(!!config);

  const [formData, setFormData] = useState({
    // Wingfoil fields
    minSpeed: config?.minSpeed || "",
    minGust: config?.minGust || "",
    directionFrom: config?.directionFrom || "",
    directionTo: config?.directionTo || "",
    // Surfing fields
    minSwellHeight: config?.minSwellHeight || "",
    maxSwellHeight: config?.maxSwellHeight || "",
    swellDirectionFrom: config?.swellDirectionFrom || "",
    swellDirectionTo: config?.swellDirectionTo || "",
    minPeriod: config?.minPeriod || "",
    optimalTide: config?.optimalTide || "both",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const sessionToken = localStorage.getItem("admin_session_token");
      if (!sessionToken) {
        setError("Not authenticated");
        return;
      }

      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

      // Prepare data - only include defined values
      const configData = {
        sessionToken,
        spotId,
        sport,
      };

      if (sport === "wingfoil") {
        if (formData.minSpeed) configData.minSpeed = parseFloat(formData.minSpeed);
        if (formData.minGust) configData.minGust = parseFloat(formData.minGust);
        if (formData.directionFrom) configData.directionFrom = parseFloat(formData.directionFrom);
        if (formData.directionTo) configData.directionTo = parseFloat(formData.directionTo);
      } else if (sport === "surfing") {
        if (formData.minSwellHeight) configData.minSwellHeight = parseFloat(formData.minSwellHeight);
        if (formData.maxSwellHeight) configData.maxSwellHeight = parseFloat(formData.maxSwellHeight);
        if (formData.swellDirectionFrom) configData.swellDirectionFrom = parseFloat(formData.swellDirectionFrom);
        if (formData.swellDirectionTo) configData.swellDirectionTo = parseFloat(formData.swellDirectionTo);
        if (formData.minPeriod) configData.minPeriod = parseFloat(formData.minPeriod);
        if (formData.optimalTide) configData.optimalTide = formData.optimalTide;
      }

      await client.mutation(api.admin.upsertSpotConfig, configData);
      alert(`${sport.charAt(0).toUpperCase() + sport.slice(1)} configuration saved!`);
      onSave();
      setExpanded(false);
    } catch (err) {
      setError(err.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!config) return;
    if (!confirm(`Delete ${sport} configuration for this spot?`)) return;

    try {
      const sessionToken = localStorage.getItem("admin_session_token");
      if (!sessionToken) return;

      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
      await client.mutation(api.admin.deleteSpotConfig, {
        sessionToken,
        configId: config._id,
      });
      alert("Configuration deleted!");
      onSave();
      setExpanded(false);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="mb-6 border border-ink/20 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold capitalize">{sport} Configuration</h3>
        <div className="space-x-2">
          {config && (
            <button
              onClick={handleDelete}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Delete
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-ink/70 hover:text-ink"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {expanded && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {sport === "wingfoil" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Min Wind Speed (knots)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.minSpeed}
                    onChange={(e) => setFormData({ ...formData, minSpeed: e.target.value })}
                    className="w-full px-4 py-2 border border-ink/30 rounded-md"
                    placeholder="e.g., 15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Min Gust Speed (knots)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.minGust}
                    onChange={(e) => setFormData({ ...formData, minGust: e.target.value })}
                    className="w-full px-4 py-2 border border-ink/30 rounded-md"
                    placeholder="e.g., 18"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Direction From (0-360°)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={formData.directionFrom}
                    onChange={(e) => setFormData({ ...formData, directionFrom: e.target.value })}
                    className="w-full px-4 py-2 border border-ink/30 rounded-md"
                    placeholder="e.g., 315"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Direction To (0-360°)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={formData.directionTo}
                    onChange={(e) => setFormData({ ...formData, directionTo: e.target.value })}
                    className="w-full px-4 py-2 border border-ink/30 rounded-md"
                    placeholder="e.g., 135"
                  />
                </div>
              </div>
            </>
          )}

          {sport === "surfing" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Min Swell Height (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.minSwellHeight}
                    onChange={(e) => setFormData({ ...formData, minSwellHeight: e.target.value })}
                    className="w-full px-4 py-2 border border-ink/30 rounded-md"
                    placeholder="e.g., 0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max Swell Height (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.maxSwellHeight}
                    onChange={(e) => setFormData({ ...formData, maxSwellHeight: e.target.value })}
                    className="w-full px-4 py-2 border border-ink/30 rounded-md"
                    placeholder="e.g., 3.0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Swell Direction From (0-360°)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={formData.swellDirectionFrom}
                    onChange={(e) => setFormData({ ...formData, swellDirectionFrom: e.target.value })}
                    className="w-full px-4 py-2 border border-ink/30 rounded-md"
                    placeholder="e.g., 270"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Swell Direction To (0-360°)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={formData.swellDirectionTo}
                    onChange={(e) => setFormData({ ...formData, swellDirectionTo: e.target.value })}
                    className="w-full px-4 py-2 border border-ink/30 rounded-md"
                    placeholder="e.g., 330"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Min Period (seconds)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.minPeriod}
                    onChange={(e) => setFormData({ ...formData, minPeriod: e.target.value })}
                    className="w-full px-4 py-2 border border-ink/30 rounded-md"
                    placeholder="e.g., 8"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Optimal Tide
                  </label>
                  <select
                    value={formData.optimalTide}
                    onChange={(e) => setFormData({ ...formData, optimalTide: e.target.value })}
                    className="w-full px-4 py-2 border border-ink/30 rounded-md"
                  >
                    <option value="both">Both</option>
                    <option value="high">High</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-ink text-white rounded-md hover:bg-ink/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : config ? "Update" : "Create"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

