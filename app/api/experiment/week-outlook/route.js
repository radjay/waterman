import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { buildWeekOutlook } from "../../../../lib/forecast-experiment/weekOutlook.js";

export const maxDuration = 60;

export async function GET() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ ok: false, error: "Forecast service unavailable" }, { status: 500 });
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const result = await buildWeekOutlook(convex, { days: 7 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Week outlook failed" },
      { status: 500 }
    );
  }
}
