"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { useToast } from "../../../components/admin/ToastProvider";

export default function SpotsList() {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    const fetchSpots = async () => {
      try {
        const sessionToken = localStorage.getItem("admin_session_token");
        if (!sessionToken) {
          router.push("/admin/login");
          return;
        }

        const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
        const data = await client.query(api.admin.listSpots, { sessionToken });
        setSpots(data);
      } catch (err) {
        setError(err.message || "Failed to load spots");
      } finally {
        setLoading(false);
      }
    };

    fetchSpots();
  }, [router]);

  const handleDelete = async (spotId, spotName) => {
    if (!confirm(`Are you sure you want to delete "${spotName}"? This will also delete all associated data (configs, forecast slots, tides, scrapes, prompts, and scores).`)) {
      return;
    }

    try {
      const sessionToken = localStorage.getItem("admin_session_token");
      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
      await client.mutation(api.admin.deleteSpot, { sessionToken, spotId });
      showToast("Spot deleted successfully!");
      // Refresh the list
      const data = await client.query(api.admin.listSpots, { sessionToken });
      setSpots(data);
    } catch (err) {
      showToast(`Error deleting spot: ${err.message}`, "error");
    }
  };

  if (loading) {
    return <div>Loading spots...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Spots</h1>
        <Link
          href="/admin/spots/new"
          className="bg-ink text-white px-4 py-2 rounded-md hover:bg-ink/90"
        >
          Add New Spot
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-ink/20">
          <thead className="bg-ink/5">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider">
                Country
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider">
                Sports
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-ink/70 uppercase tracking-wider">
                Windy Spot ID
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-ink/70 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-ink/20">
            {spots.map((spot) => (
              <tr key={spot._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-ink">{spot.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-ink/70">{spot.country || "-"}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-ink/70">
                    {spot.sports && spot.sports.length > 0
                      ? spot.sports.join(", ")
                      : "-"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-ink/70">{spot.windySpotId || "-"}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/admin/spots/${spot._id}`}
                    className="text-ink hover:text-ink/70 mr-4"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(spot._id, spot.name)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

