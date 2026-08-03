"use client";

import { useState, useEffect } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import {
  Loader2,
  Sparkles,
  User,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

const SPORT_LABELS = {
  wingfoil: "Wingfoiling",
  surfing: "Surfing",
};

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ExpertInputCard({ input }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(input.context);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-surface border border-card rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-surface transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-marginal/10 text-marginal text-xs font-medium rounded">
                <Sparkles className="w-3 h-3" />
                Expert
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-tint-card text-accent text-xs font-medium rounded capitalize">
                {SPORT_LABELS[input.sport] || input.sport}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-ink font-medium">
                <MapPin className="w-4 h-4" />
                {input.spotName}
                {input.spotCountry && (
                  <span className="text-faded-ink">({input.spotCountry})</span>
                )}
              </span>
              <span className="flex items-center gap-1 text-faded-ink">
                <User className="w-4 h-4" />
                {input.userEmail}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-faded-ink">
              {formatDate(input.updatedAt)}
            </span>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-dim" />
            ) : (
              <ChevronDown className="w-5 h-5 text-dim" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className="bg-surface rounded-md p-4 relative">
            <p className="text-sm text-ink whitespace-pre-wrap pr-8">
              {input.context}
            </p>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-2 text-dim hover:text-faded-ink hover:bg-ink-hover rounded transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-4 h-4 text-accent" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-faded-ink">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Created: {formatDate(input.createdAt)}
            </span>
            <span>Updated: {formatDate(input.updatedAt)}</span>
          </div>

          <div className="flex gap-2">
            <a
              href={`/admin/spots/${input.spotId}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-ink bg-ink-hover hover:bg-ink-hover rounded transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View Spot Config
            </a>
            <a
              href={`/admin/prompts?spotId=${input.spotId}&sport=${input.sport}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-accent bg-accent-tint-card hover:bg-accent-tint-card rounded transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              Edit Prompt
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExpertInputsPage() {
  const [expertInputs, setExpertInputs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, wingfoil, surfing

  useEffect(() => {
    async function fetchExpertInputs() {
      try {
        const inputs = await client.query(
          api.personalization.getAllExpertInputs,
          {}
        );
        setExpertInputs(inputs);
      } catch (err) {
        console.error("Error loading expert inputs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchExpertInputs();
  }, []);

  const filteredInputs =
    filter === "all"
      ? expertInputs
      : expertInputs.filter((i) => i.sport === filter);

  // Group by spot for summary
  const spotGroups = filteredInputs.reduce((acc, input) => {
    const key = `${input.spotId}-${input.sport}`;
    if (!acc[key]) {
      acc[key] = {
        spotName: input.spotName,
        spotCountry: input.spotCountry,
        sport: input.sport,
        count: 0,
      };
    }
    acc[key].count++;
    return acc;
  }, {});

  const uniqueSpots = Object.values(spotGroups);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-dim animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            Expert Inputs
          </h1>
          <p className="text-sm text-faded-ink mt-1">
            Review user-submitted expert knowledge for spot-specific prompts
          </p>
        </div>

        {/* Filter */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-btn rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="all">All Sports</option>
          <option value="wingfoil">Wingfoiling</option>
          <option value="surfing">Surfing</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-surface p-4 rounded-lg border border-card">
          <div className="text-3xl font-bold text-ink">
            {filteredInputs.length}
          </div>
          <div className="text-sm text-faded-ink">Total Expert Inputs</div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-card">
          <div className="text-3xl font-bold text-ink">
            {uniqueSpots.length}
          </div>
          <div className="text-sm text-faded-ink">Spots with Expert Input</div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-card">
          <div className="text-3xl font-bold text-ink">
            {new Set(filteredInputs.map((i) => i.userId)).size}
          </div>
          <div className="text-sm text-faded-ink">Contributing Users</div>
        </div>
      </div>

      {/* Expert Inputs List */}
      {filteredInputs.length === 0 ? (
        <div className="bg-surface rounded-lg p-8 text-center">
          <Sparkles className="w-12 h-12 text-dim mx-auto mb-4" />
          <h3 className="text-lg font-medium text-ink mb-2">
            No Expert Inputs Yet
          </h3>
          <p className="text-sm text-faded-ink">
            When users submit spot notes marked as &quot;expert input&quot;,
            they&apos;ll appear here for review.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-ink">
            All Expert Inputs ({filteredInputs.length})
          </h2>
          {filteredInputs.map((input) => (
            <ExpertInputCard key={input._id} input={input} />
          ))}
        </div>
      )}
    </div>
  );
}
