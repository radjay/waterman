import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { buildTodayOutlook } from "../../../../lib/forecast-experiment/todayOutlook.js";

export const maxDuration = 60;

export async function GET() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ ok: false, error: "Forecast service unavailable" }, { status: 500 });
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const result = await buildTodayOutlook(convex);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Today outlook failed" },
      { status: 500 }
    );
  }
}
