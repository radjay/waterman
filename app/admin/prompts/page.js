"use client";

import { useState, useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import Link from "next/link";
import { useToast } from "../../../components/admin/ToastProvider";

export default function PromptsManagement() {
  const [activeTab, setActiveTab] = useState("system");
  const [systemPrompts, setSystemPrompts] = useState([]);
  const [spotPrompts, setSpotPrompts] = useState([]);
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionToken = localStorage.getItem("admin_session_token");
        if (!sessionToken) return;

        const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

        // Fetch system prompts
        const systemData = await client.query(api.admin.listSystemSportPrompts, {
          sessionToken,
        });
        setSystemPrompts(systemData);

        // Fetch spot prompts
        const spotData = await client.query(api.admin.listSpotSportPrompts, {
          sessionToken,
        });
        setSpotPrompts(spotData);

        // Fetch spots for spot prompt management
        const spotsData = await client.query(api.admin.listSpots, { sessionToken });
        setSpots(spotsData);
      } catch (err) {
        setError(err.message || "Failed to load prompts");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const sessionToken = localStorage.getItem("admin_session_token");
      if (!sessionToken) return;

      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

      const systemData = await client.query(api.admin.listSystemSportPrompts, {
        sessionToken,
      });
      setSystemPrompts(systemData);

      const spotData = await client.query(api.admin.listSpotSportPrompts, {
        sessionToken,
      });
      setSpotPrompts(spotData);
    } catch (err) {
      setError(err.message || "Failed to refresh prompts");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading prompts...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Prompts</h1>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 border border-ink/30 rounded-md hover:bg-ink/5"
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-ink/20 mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab("system")}
            className={`pb-4 px-4 border-b-2 transition-colors ${
              activeTab === "system"
                ? "border-ink font-semibold"
                : "border-transparent text-ink/70 hover:text-ink"
            }`}
          >
            System Prompts
          </button>
          <button
            onClick={() => setActiveTab("spots")}
            className={`pb-4 px-4 border-b-2 transition-colors ${
              activeTab === "spots"
                ? "border-ink font-semibold"
                : "border-transparent text-ink/70 hover:text-ink"
            }`}
          >
            Spot-Sport Prompts
          </button>
        </div>
      </div>

      {/* System Prompts Tab */}
      {activeTab === "system" && (
        <SystemPromptsTab
          prompts={systemPrompts}
          onUpdate={handleRefresh}
        />
      )}

      {/* Spot Prompts Tab */}
      {activeTab === "spots" && (
        <SpotPromptsTab
          prompts={spotPrompts}
          spots={spots}
          onUpdate={handleRefresh}
        />
      )}
    </div>
  );
}

function SystemPromptsTab({ prompts, onUpdate }) {
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ sport: "", prompt: "", isActive: true });
  const { showToast, ToastContainer } = useToast();

  const handleEdit = (prompt) => {
    setEditingId(prompt._id);
    setFormData({
      sport: prompt.sport,
      prompt: prompt.prompt,
      isActive: prompt.isActive,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ sport: "", prompt: "", isActive: true });
  };

  const handleSave = async () => {
    try {
      const sessionToken = localStorage.getItem("admin_session_token");
      if (!sessionToken) {
        showToast("Not authenticated", "error");
        return;
      }

      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
      await client.mutation(api.admin.upsertSystemSportPrompt, {
        sessionToken,
        sport: formData.sport,
        prompt: formData.prompt,
        isActive: formData.isActive,
      });

      showToast("System prompt saved!");
      handleCancel();
      onUpdate();
    } catch (err) {
      showToast(`Error: ${err.message}`, "error");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">System Sport Prompts</h2>
        <p className="text-ink/70 mb-4">
          System prompts define general evaluation guidelines for each sport. These are shared across all spots.
        </p>
      </div>

      <div className="space-y-4">
        {prompts.map((prompt) => (
          <div key={prompt._id} className="bg-white rounded-lg shadow p-6">
            {editingId === prompt._id ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Sport</label>
                  <input
                    type="text"
                    value={formData.sport}
                    onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                    className="w-full px-4 py-2 border border-ink/30 rounded-md"
                    placeholder="e.g., wingfoil, surfing"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Prompt</label>
                  <textarea
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    className="w-full px-4 py-2 border border-ink/30 rounded-md h-48"
                    placeholder="Enter the system prompt for this sport..."
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <label className="text-sm">Active</label>
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 border border-ink/30 rounded-md hover:bg-ink/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-ink text-white rounded-md hover:bg-ink/90"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold capitalize">{prompt.sport}</h3>
                    <span className={`text-sm ${prompt.isActive ? "text-green-600" : "text-gray-500"}`}>
                      {prompt.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleEdit(prompt)}
                    className="px-4 py-2 border border-ink/30 rounded-md hover:bg-ink/5"
                  >
                    Edit
                  </button>
                </div>
                <div className="bg-ink/5 rounded p-4">
                  <pre className="whitespace-pre-wrap text-sm text-ink/80 font-mono">
                    {prompt.prompt}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}

        {prompts.length === 0 && (
          <div className="text-center py-8 text-ink/70">
            No system prompts found. Create one by editing an existing prompt or adding a new sport.
          </div>
        )}
      </div>
    </div>
  );
}

function SpotPromptsTab({ prompts, spots, onUpdate }) {
  const [editingId, setEditingId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    spotId: "",
    sport: "",
    spotPrompt: "",
    temporalPrompt: "",
    isActive: true,
  });
  const { showToast, ToastContainer } = useToast();

  const handleEdit = (prompt) => {
    setEditingId(prompt._id);
    setFormData({
      spotId: prompt.spotId,
      sport: prompt.sport,
      spotPrompt: prompt.spotPrompt,
      temporalPrompt: prompt.temporalPrompt,
      isActive: prompt.isActive,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowCreateForm(false);
    setFormData({
      spotId: "",
      sport: "",
      spotPrompt: "",
      temporalPrompt: "",
      isActive: true,
    });
  };

  const handleSave = async () => {
    try {
      const sessionToken = localStorage.getItem("admin_session_token");
      if (!sessionToken) {
        showToast("Not authenticated", "error");
        return;
      }

      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
      await client.mutation(api.admin.upsertSpotSportPrompt, {
        sessionToken,
        spotId: formData.spotId,
        sport: formData.sport,
        spotPrompt: formData.spotPrompt,
        temporalPrompt: formData.temporalPrompt,
        isActive: formData.isActive,
      });

      showToast("Spot prompt saved!");
      handleCancel();
      onUpdate();
    } catch (err) {
      showToast(`Error: ${err.message}`, "error");
    }
  };

  const handleDelete = async (promptId) => {
    if (!confirm("Are you sure you want to delete this prompt?")) return;

    try {
      const sessionToken = localStorage.getItem("admin_session_token");
      if (!sessionToken) return;

      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
      await client.mutation(api.admin.deleteSpotSportPrompt, {
        sessionToken,
        promptId,
      });

      showToast("Prompt deleted!");
      onUpdate();
    } catch (err) {
      showToast(`Error: ${err.message}`, "error");
    }
  };

  const getSpotName = (spotId) => {
    const spot = spots.find((s) => s._id === spotId);
    return spot ? spot.name : spotId;
  };

  return (
    <div>
      <ToastContainer />
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold mb-4">Spot-Sport Prompts</h2>
          <p className="text-ink/70">
            Spot-specific prompts define characteristics and temporal context for each spot-sport combination.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-ink text-white rounded-md hover:bg-ink/90"
        >
          Create New Prompt
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Spot-Sport Prompt</h3>
          <PromptForm
            formData={formData}
            setFormData={setFormData}
            spots={spots}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}

      <div className="space-y-4">
        {prompts.map((prompt) => (
          <div key={prompt._id} className="bg-white rounded-lg shadow p-6">
            {editingId === prompt._id ? (
              <PromptForm
                formData={formData}
                setFormData={setFormData}
                spots={spots}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            ) : (
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {getSpotName(prompt.spotId)} - {prompt.sport}
                    </h3>
                    <span className={`text-sm ${prompt.isActive ? "text-green-600" : "text-gray-500"}`}>
                      {prompt.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleEdit(prompt)}
                      className="px-4 py-2 border border-ink/30 rounded-md hover:bg-ink/5"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(prompt._id)}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Spot Prompt</h4>
                    <div className="bg-ink/5 rounded p-4">
                      <pre className="whitespace-pre-wrap text-sm text-ink/80 font-mono">
                        {prompt.spotPrompt}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Temporal Prompt</h4>
                    <div className="bg-ink/5 rounded p-4">
                      <pre className="whitespace-pre-wrap text-sm text-ink/80 font-mono">
                        {prompt.temporalPrompt}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {prompts.length === 0 && (
          <div className="text-center py-8 text-ink/70">
            No spot-sport prompts found. Create one to customize scoring for specific spots.
          </div>
        )}
      </div>
    </div>
  );
}

function PromptForm({ formData, setFormData, spots, onSave, onCancel }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Spot</label>
        <select
          value={formData.spotId}
          onChange={(e) => setFormData({ ...formData, spotId: e.target.value })}
          className="w-full px-4 py-2 border border-ink/30 rounded-md"
          required
        >
          <option value="">Select a spot</option>
          {spots.map((spot) => (
            <option key={spot._id} value={spot._id}>
              {spot.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Sport</label>
        <select
          value={formData.sport}
          onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
          className="w-full px-4 py-2 border border-ink/30 rounded-md"
          required
        >
          <option value="">Select a sport</option>
          <option value="wingfoil">Wingfoil</option>
          <option value="surfing">Surfing</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Spot Prompt</label>
        <textarea
          value={formData.spotPrompt}
          onChange={(e) => setFormData({ ...formData, spotPrompt: e.target.value })}
          className="w-full px-4 py-2 border border-ink/30 rounded-md h-32"
          placeholder="Enter spot-specific characteristics..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Temporal Prompt</label>
        <textarea
          value={formData.temporalPrompt}
          onChange={(e) => setFormData({ ...formData, temporalPrompt: e.target.value })}
          className="w-full px-4 py-2 border border-ink/30 rounded-md h-32"
          placeholder="Enter temporal context instructions..."
          required
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="mr-2"
        />
        <label className="text-sm">Active</label>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-ink/30 rounded-md hover:bg-ink/5"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-ink text-white rounded-md hover:bg-ink/90"
        >
          Save
        </button>
      </div>
    </div>
  );
}

