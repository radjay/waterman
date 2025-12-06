import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { Flame, Wind, Waves } from "lucide-react";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
export const revalidate = 0; // Dynamic on every request

const getRealDate = (dayStr) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dayStr.toUpperCase() === "TODAY") {
    return today
      .toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
      .toUpperCase();
  }
  if (dayStr.toUpperCase() === "TOMORROW") {
    return tomorrow
      .toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
      .toUpperCase();
  }
  return dayStr;
};

const getCardinalDirection = (degrees) => {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

export default async function Home() {
  // 1. Fetch Spots
  const spots = await client.query(api.spots.list);

  // 2. Fetch Forecasts & Configs (Granular)
  let allSlots = [];

  await Promise.all(
    spots.map(async (spot) => {
      const [slotsData, config] = await Promise.all([
        client.query(api.spots.getForecastSlots, { spotId: spot._id }),
        client.query(api.spots.getSpotConfig, { spotId: spot._id }),
      ]);

      if (!slotsData) return;

      slotsData.forEach((slot) => {
        // Enrich
        const date = new Date(slot.timestamp);
        const hourStr = date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }); // e.g. "15:00"

        const isEpic = slot.speed >= 20 && slot.gust - slot.speed <= 10;

        const enriched = {
          ...slot,
          spotName: spot.name,
          spotId: spot._id,
          hour: hourStr,
          isEpic,
        };

        // Apply Filter
        if (config) {
          const isSpeed = slot.speed >= config.minSpeed;
          const isGust = slot.gust >= config.minGust;

          let isDir = false;
          if (config.directionFrom <= config.directionTo) {
            isDir =
              slot.direction >= config.directionFrom &&
              slot.direction <= config.directionTo;
          } else {
            isDir =
              slot.direction >= config.directionFrom ||
              slot.direction <= config.directionTo;
          }

          if (isSpeed && isGust && isDir) {
            allSlots.push(enriched);
          }
        } else {
          allSlots.push(enriched);
        }
      });
    })
  );

  // 3. Group by Date
  const grouped = allSlots.reduce((acc, slot) => {
    const dateObj = new Date(slot.timestamp);
    // Format: "Tue, Dec 9"
    const dayStr = dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    if (!acc[dayStr]) acc[dayStr] = [];
    acc[dayStr].push(slot);
    return acc;
  }, {});

  // Sort days chronologically?
  // We can rely on insertion order or sort the keys by parsing.
  // Let's sort keys based on the timestamp of the first slot in that day.
  const sortedDays = Object.keys(grouped).sort((a, b) => {
    return grouped[a][0].timestamp - grouped[b][0].timestamp;
  });

  // Sort slots within days by timestamp and identify Ideal slot
  sortedDays.forEach((day) => {
    const slots = grouped[day];
    slots.sort((a, b) => a.timestamp - b.timestamp);

    if (slots.length > 0) {
      // Find max speed slot
      const maxSpeed = Math.max(...slots.map((s) => s.speed));
      const idealSlot = slots.find((s) => s.speed === maxSpeed);
      if (idealSlot) {
        idealSlot.isIdeal = true;
      }
    }
  });

  const todayStr = new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();

  return (
    <main className="max-w-[900px] mx-auto p-8 border-l border-r border-black/10 min-h-screen bg-newsprint shadow-[0_0_20px_rgba(0,0,0,0.1)]">
      <header className="text-center border-b-4 border-double border-ink pb-6 mb-8">
        <h1 className="font-headline text-[3.5rem] font-black uppercase tracking-[-2px] leading-none mb-2 text-ink">
          The Waterman Report
        </h1>
        <div className="flex justify-between border-t border-b border-ink py-2 font-headline font-bold uppercase text-[0.9rem]">
          <span>Vol. 1</span>
          <span>{todayStr}</span>
          <span>Lisbon, PT</span>
        </div>
      </header>

      {sortedDays.length === 0 ? (
        <div className="text-center p-16 font-headline italic text-2xl text-faded-ink border border-dashed border-ink">
          NO FORECASTS TO DISPLAY AT THIS TIME.
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {sortedDays.map((day) => (
            <div key={day} className="mb-4">
              <div className="font-headline text-[1.8rem] font-bold border-b-2 border-ink mb-4 pb-1 sticky top-0 bg-newsprint z-10 text-ink">
                {day.toUpperCase()}
              </div>
              <div className="flex flex-col border-t border-ink">
                {grouped[day].map((slot) => {
                  return (
                    <div
                      key={slot._id}
                      className={`grid grid-cols-[80px_240px_1fr_1fr_60px] items-stretch p-0 border-b border-ink font-body text-[0.95rem] ${slot.isIdeal ? "is-ideal" : "bg-transparent"} ${slot.isEpic ? "is-epic" : ""}`}
                    >
                      <div className="font-bold text-ink pl-3 flex items-center h-full">
                        {slot.hour}
                      </div>
                      <div className="slot-spot font-headline font-bold text-[1.1rem] text-ink">
                        {slot.spotName}
                      </div>

                      {/* Wind Group */}
                      <div className="slot-data-group">
                        <div className="metrics">
                          <Wind size={14} />
                          <span>
                            {Math.round(slot.speed)} kn{" "}
                            <span>({Math.round(slot.gust)}*)</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="inline-block"
                            style={{
                              transform: `rotate(${slot.direction}deg)`,
                            }}
                          >
                            ↑
                          </div>
                          <span>
                            {getCardinalDirection(slot.direction + 180)}
                          </span>
                        </div>
                      </div>

                      {/* Wave Group */}
                      <div className="slot-data-group">
                        <div className="metrics">
                          <Waves size={14} />
                          <span>
                            {slot.waveHeight ? slot.waveHeight.toFixed(1) : "-"}
                            m <span>({slot.wavePeriod || 0}s)</span>
                          </span>
                        </div>
                        {slot.waveDirection ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="inline-block"
                              style={{
                                transform: `rotate(${slot.waveDirection}deg)`,
                              }}
                            >
                              ↑
                            </div>
                            <span>
                              {getCardinalDirection(slot.waveDirection + 180)}
                            </span>
                          </div>
                        ) : (
                          <div className="text-gray-300">-</div>
                        )}
                      </div>

                      <div className="flex items-center">
                        {slot.isEpic && (
                          <div className="text-red-accent border border-red-accent px-1 font-headline font-bold text-[0.6rem] uppercase tracking-[0.5px] inline-block leading-[1.4]">
                            EPIC
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
