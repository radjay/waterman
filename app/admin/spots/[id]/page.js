"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { SpotConfigForm } from "../../../../components/admin/SpotConfigForm";
import { useToast } from "../../../../components/admin/ToastProvider";

export default function SpotEdit() {
  const params = useParams();
  const router = useRouter();
  const spotId = params.id === "new" ? null : params.id;
  const isNew = spotId === null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { showToast, ToastContainer } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    url: "",
    country: "",
    town: "",
    windySpotId: "",
    sports: [],
    webcamUrl: "",
    webcamStreamSource: "",
    liveReportUrl: "",
  });

  const [configs, setConfigs] = useState([]);

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }

    const fetchSpot = async () => {
      try {
        const sessionToken = localStorage.getItem("admin_session_token");
        if (!sessionToken) {
          router.push("/admin/login");
          return;
        }

        const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
        const spot = await client.query(api.admin.getSpot, {
          sessionToken,
          spotId: spotId,
        });

        if (spot) {
          setFormData({
            name: spot.name || "",
            url: spot.url || "",
            country: spot.country || "",
            town: spot.town || "",
            windySpotId: spot.windySpotId || "",
            sports: spot.sports || [],
            webcamUrl: spot.webcamUrl || "",
            webcamStreamSource: spot.webcamStreamSource || "",
            liveReportUrl: spot.liveReportUrl || "",
          });

          // Fetch configs
          const spotConfigs = await client.query(api.admin.getSpotConfigs, {
            sessionToken,
            spotId: spotId,
          });
          setConfigs(spotConfigs || []);
        }
      } catch (err) {
        setError(err.message || "Failed to load spot");
      } finally {
        setLoading(false);
      }
    };

    fetchSpot();
  }, [spotId, isNew, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const sessionToken = localStorage.getItem("admin_session_token");
      if (!sessionToken) {
        router.push("/admin/login");
        return;
      }

      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

      if (isNew) {
        const result = await client.mutation(api.admin.createSpot, {
          sessionToken,
          name: formData.name,
          url: formData.url,
          country: formData.country || undefined,
          town: formData.town || undefined,
          windySpotId: formData.windySpotId || undefined,
          sports: formData.sports.length > 0 ? formData.sports : undefined,
          webcamUrl: formData.webcamUrl || undefined,
          webcamStreamSource: formData.webcamStreamSource || undefined,
          liveReportUrl: formData.liveReportUrl || undefined,
        });
        router.push(`/admin/spots/${result.spotId}`);
      } else {
        await client.mutation(api.admin.updateSpot, {
          sessionToken,
          spotId: spotId,
          name: formData.name,
          url: formData.url,
          country: formData.country || undefined,
          town: formData.town || undefined,
          windySpotId: formData.windySpotId || undefined,
          sports: formData.sports.length > 0 ? formData.sports : undefined,
          webcamUrl: formData.webcamUrl || undefined,
          webcamStreamSource: formData.webcamStreamSource || undefined,
          liveReportUrl: formData.liveReportUrl || undefined,
        });
        showToast("Spot updated successfully!");
      }
      } catch (err) {
      setError(err.message || "Failed to save spot");
      showToast(`Error: ${err.message || "Failed to save spot"}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleSport = (sport) => {
    setFormData((prev) => ({
      ...prev,
      sports: prev.sports.includes(sport)
        ? prev.sports.filter((s) => s !== sport)
        : [...prev.sports, sport],
    }));
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <ToastContainer />
      <div className="mb-8">
        <Link href="/admin/spots" className="text-ink/70 hover:text-ink mb-4 inline-block">
          ← Back to Spots
        </Link>
        <h1 className="text-3xl font-bold mt-4">
          {isNew ? "Create Spot" : "Edit Spot"}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-ink/30 rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Windy.app URL <span className="text-red-600">*</span>
          </label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="w-full px-4 py-2 border border-ink/30 rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">City</label>
          <input
            type="text"
            value={formData.town}
            onChange={(e) => setFormData({ ...formData, town: e.target.value })}
            className="w-full px-4 py-2 border border-ink/30 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Country</label>
          <select
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            className="w-full px-4 py-2 border border-ink/30 rounded-md"
          >
            <option value="">Select a country</option>
            <option value="Portugal">Portugal</option>
            <option value="Spain">Spain</option>
            <option value="France">France</option>
            <option value="Morocco">Morocco</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Ireland">Ireland</option>
            <option value="Italy">Italy</option>
            <option value="Greece">Greece</option>
            <option value="Croatia">Croatia</option>
            <option value="Brazil">Brazil</option>
            <option value="United States">United States</option>
            <option value="Australia">Australia</option>
            <option value="South Africa">South Africa</option>
            <option value="Indonesia">Indonesia</option>
            <option value="Philippines">Philippines</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Windy Spot ID</label>
          <input
            type="text"
            value={formData.windySpotId}
            onChange={(e) => setFormData({ ...formData, windySpotId: e.target.value })}
            className="w-full px-4 py-2 border border-ink/30 rounded-md"
            placeholder="e.g., 8512151"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Sports</label>
          <div className="space-y-2">
            {["wingfoil", "surfing"].map((sport) => (
              <label key={sport} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.sports.includes(sport)}
                  onChange={() => toggleSport(sport)}
                  className="mr-2"
                />
                <span className="capitalize">{sport}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Webcam URL</label>
          <input
            type="url"
            value={formData.webcamUrl}
            onChange={(e) => setFormData({ ...formData, webcamUrl: e.target.value })}
            className="w-full px-4 py-2 border border-ink/30 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Webcam Stream Source</label>
          <select
            value={formData.webcamStreamSource}
            onChange={(e) =>
              setFormData({ ...formData, webcamStreamSource: e.target.value })
            }
            className="w-full px-4 py-2 border border-ink/30 rounded-md"
          >
            <option value="">None</option>
            <option value="iol">IOL</option>
            <option value="quanteec">Quanteec</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Live Report URL</label>
          <input
            type="url"
            value={formData.liveReportUrl}
            onChange={(e) => setFormData({ ...formData, liveReportUrl: e.target.value })}
            className="w-full px-4 py-2 border border-ink/30 rounded-md"
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Link
            href="/admin/spots"
            className="px-4 py-2 border border-ink/30 rounded-md hover:bg-ink/5"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-ink text-white rounded-md hover:bg-ink/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : isNew ? "Create" : "Save"}
          </button>
        </div>
      </form>

      {!isNew && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Spot Configurations</h2>
          <p className="text-ink/70 mb-4">
            Configure sport-specific criteria for this spot. These determine which conditions are marked as "ideal".
          </p>

          {["wingfoil", "surfing"].map((sport) => {
            const config = configs.find((c) => c.sport === sport);

            return (
              <SpotConfigForm
                key={sport}
                spotId={spotId}
                sport={sport}
                config={config}
                onSave={() => {
                  // Refresh configs after save
                  const fetchConfigs = async () => {
                    const sessionToken = localStorage.getItem("admin_session_token");
                    if (!sessionToken) return;
                    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
                    const spotConfigs = await client.query(api.admin.getSpotConfigs, {
                      sessionToken,
                      spotId: spotId,
                    });
                    setConfigs(spotConfigs || []);
                  };
                  fetchConfigs();
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

