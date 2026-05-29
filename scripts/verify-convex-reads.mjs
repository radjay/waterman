#!/usr/bin/env node
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  console.error("NEXT_PUBLIC_CONVEX_URL is missing (.env.local)");
  process.exit(1);
}

const queries = [
  {
    name: "spots.getReportData",
    args: { sports: ["wingfoil"] },
    validate(value) {
      if (!value?.spots?.length) throw new Error("expected spots");
      const slotCount = value.spots.reduce(
        (sum, spot) => sum + (value.data[spot._id]?.slots?.length || 0),
        0
      );
      if (slotCount < 50) throw new Error(`expected 50+ slots, got ${slotCount}`);
    },
  },
  {
    name: "spots.getDashboardData",
    args: { sports: ["wingfoil"] },
    validate(value) {
      if (!value?.spots?.length) throw new Error("expected dashboard spots");
    },
  },
  {
    name: "spots.getCamsData",
    args: { sports: ["wingfoil"] },
    validate(value) {
      if (!Array.isArray(value?.spots)) throw new Error("expected webcam spots array");
    },
  },
  {
    name: "calendar.getSportFeed",
    args: { sport: "wingfoil" },
    validate(value) {
      if (!value?.metadata) throw new Error("expected calendar metadata");
    },
  },
  {
    name: "forecastExperiment.experimentDashboard",
    args: {},
    validate(value) {
      if (!value?.latestPredictions) throw new Error("expected experiment dashboard payload");
    },
  },
];

async function runQuery(name, args) {
  const path = name.includes(":") ? name : name.replace(".", ":");
  const response = await fetch(`${convexUrl}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args }),
  });

  const payload = await response.json();
  if (payload.status === "error") {
    throw new Error(payload.errorMessage || "Convex query failed");
  }

  return payload.value;
}

let failed = false;

for (const query of queries) {
  const started = Date.now();
  try {
    const value = await runQuery(query.name, query.args);
    query.validate?.(value);
    console.log(`OK  ${query.name} (${Date.now() - started}ms)`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${query.name}: ${error.message}`);
  }
}

process.exit(failed ? 1 : 0);
