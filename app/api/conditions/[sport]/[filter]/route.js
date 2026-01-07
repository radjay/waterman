import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { enrichSlots } from "../../../../../lib/slots";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

const VALID_SPORTS = ["wingfoil", "surfing"];
const VALID_FILTERS = ["best", "all"];

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function GET(_request, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const sportParam = resolvedParams?.sport || "";
    const filterParam = resolvedParams?.filter || "";

    if (!VALID_SPORTS.includes(sportParam)) {
      return NextResponse.json(
        { error: `Invalid sport. Expected one of: ${VALID_SPORTS.join(", ")}` },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!VALID_FILTERS.includes(filterParam)) {
      return NextResponse.json(
        { error: `Invalid filter. Expected one of: ${VALID_FILTERS.join(", ")}` },
        { status: 400, headers: corsHeaders() }
      );
    }

    const sport = sportParam;
    const filter = filterParam;
    const selectedSports = [sport];

    const spots = await client.query(api.spots.list, { sports: selectedSports });

    const spotResults = await Promise.all(
      spots.map(async (spot) => {
        const spotSports =
          spot.sports && spot.sports.length > 0 ? spot.sports : ["wingfoil"];
        const relevantSports = spotSports.filter((s) => selectedSports.includes(s));

        if (relevantSports.length === 0) {
          return {
            id: spot._id,
            name: spot.name,
            slots: [],
            tides: [],
          };
        }

        const [slotsData, tidesData, scoreRows] = await Promise.all([
          client.query(api.spots.getForecastSlots, { spotId: spot._id }),
          client.query(api.spots.getTides, { spotId: spot._id }),
          client.query(api.spots.getConditionScores, { spotId: spot._id, sport }),
        ]);

        const scoresMap = {};
        for (const score of scoreRows) {
          const key = `${score.slotId}_${sport}`;
          scoresMap[key] = score;
        }

        const enriched = enrichSlots(
          slotsData || [],
          spot,
          [],
          scoresMap,
          relevantSports
        );

        const filtered =
          filter === "best"
            ? enriched.filter((slot) => {
                if (slot.isTideOnly) return true;
                return !!(slot.score && slot.score.value >= 60);
              })
            : enriched;

        return {
          id: spot._id,
          name: spot.name,
          slots: filtered,
          tides: tidesData || [],
        };
      })
    );

    const res = NextResponse.json(
      {
        sport,
        filter,
        generatedAt: Date.now(),
        spots: spotResults,
      },
      { status: 200 }
    );

    const headers = corsHeaders();
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    res.headers.set("Cache-Control", "public, max-age=60");

    return res;
  } catch (error) {
    console.error("Error generating conditions response:", error);
    return NextResponse.json(
      { error: "Error generating conditions response" },
      { status: 500, headers: corsHeaders() }
    );
  }
}


