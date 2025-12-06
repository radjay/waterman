import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { MainLayout } from "../components/templates/MainLayout";
import { Header } from "../components/organisms/Header";
import { EmptyState } from "../components/organisms/EmptyState";
import { DaySection } from "../components/organisms/DaySection";
import { formatDate, formatTime } from "../lib/utils";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
export const revalidate = 0; // Dynamic on every request

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
        const hourStr = formatTime(date);

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
    const dayStr = formatDate(dateObj);

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

  return (
    <MainLayout>
      <Header />

      {sortedDays.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-8">
          {sortedDays.map((day) => (
            <DaySection key={day} day={day} slots={grouped[day]} />
          ))}
        </div>
      )}
    </MainLayout>
  );
}
