import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { buildDayWindChart } from "../../../../lib/forecast-experiment/dayWindChartData.js";
import { localDateKey } from "../../../../lib/forecast-experiment/time.js";

export const maxDuration = 30;

export async function GET(request) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ ok: false, error: "Forecast service unavailable" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const dateLocal =
    searchParams.get("date") ?? localDateKey(Date.now(), "Europe/Lisbon");

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const chart = await buildDayWindChart(convex, dateLocal);
    return NextResponse.json(chart);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Chart failed" },
      { status: 500 }
    );
  }
}
