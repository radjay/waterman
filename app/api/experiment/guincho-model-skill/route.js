import { NextResponse } from "next/server";
import { loadGuinchoSkillSummary } from "../../../../lib/forecast-experiment/loadGuinchoSkillSummary.js";

export async function GET() {
  const result = await loadGuinchoSkillSummary();
  if (!result.ok) {
    const status = result.error?.includes("missing") ? 404 : 500;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
