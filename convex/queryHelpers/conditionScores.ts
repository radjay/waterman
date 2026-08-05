import { Id } from "../_generated/dataModel";

type QueryCtx = { db: any };

type ScoreDoc = {
  timestamp: number;
  userId: string | null;
  _creationTime: number;
  [key: string]: unknown;
};

function dedupeScoresByTimestamp(
  scores: ScoreDoc[],
  userId?: string
): ScoreDoc[] {
  const scoresByTimestamp = new Map<number, ScoreDoc>();

  const systemScores = scores.filter((s) => s.userId === null);
  for (const score of systemScores) {
    const existing = scoresByTimestamp.get(score.timestamp);
    if (!existing || score._creationTime > existing._creationTime) {
      scoresByTimestamp.set(score.timestamp, score);
    }
  }

  if (userId !== undefined) {
    const personalizedScores = scores.filter((s) => s.userId === userId);
    for (const score of personalizedScores) {
      scoresByTimestamp.set(score.timestamp, score);
    }
  }

  return Array.from(scoresByTimestamp.values()).sort(
    (a, b) => a.timestamp - b.timestamp
  );
}

export async function getConditionScoresForSpotSport(
  ctx: QueryCtx,
  spotId: Id<"spots">,
  sport: string,
  options: {
    userId?: string;
    cutoffDays?: number;
    futureDays?: number;
    cutoffTimestamp?: number;
    upperTimestamp?: number;
  } = {}
) {
  const now = Date.now();
  const cutoff =
    options.cutoffTimestamp ??
    now - (options.cutoffDays ?? 2) * 24 * 60 * 60 * 1000;
  // 7, not 11. The app charts six days; days 7-11 were read on every call and
  // displayed nowhere. The earlier pass at this query narrowed only the backward
  // cutoff, which is why the forward window kept the read span at 13 days.
  const upper =
    options.upperTimestamp ??
    now + (options.futureDays ?? 7) * 24 * 60 * 60 * 1000;

  const filtered = await ctx.db
    .query("condition_scores")
    .withIndex("by_spot_sport_timestamp", (q: any) =>
      q
        .eq("spotId", spotId)
        .eq("sport", sport)
        .gte("timestamp", cutoff)
        .lte("timestamp", upper)
    )
    .collect();

  if (options.userId !== undefined) {
    return dedupeScoresByTimestamp(filtered, options.userId);
  }

  return dedupeScoresByTimestamp(
    filtered.filter((s: ScoreDoc) => s.userId === null)
  );
}

export async function getConditionScoresForSpot(
  ctx: QueryCtx,
  spotId: Id<"spots">,
  options: {
    sports?: string[];
    userId?: string;
    cutoffDays?: number;
    futureDays?: number;
    cutoffTimestamp?: number;
  } = {}
) {
  let sports = options.sports;
  if (!sports || sports.length === 0) {
    const spot = await ctx.db.get(spotId);
    sports =
      spot?.sports && spot.sports.length > 0 ? spot.sports : ["wingfoil"];
  }

  const allScores: ScoreDoc[] = [];
  for (const sport of sports) {
    const sportScores = await getConditionScoresForSpotSport(
      ctx,
      spotId,
      sport,
      options
    );
    allScores.push(...sportScores);
  }

  return allScores.sort((a, b) => a.timestamp - b.timestamp);
}
