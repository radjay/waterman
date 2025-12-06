import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { Flame, Wind, Waves } from "lucide-react";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
export const revalidate = 0; // Dynamic on every request

const getRealDate = (dayStr) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dayStr.toUpperCase() === 'TODAY') {
        return today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
    }
    if (dayStr.toUpperCase() === 'TOMORROW') {
        return tomorrow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
    }
    return dayStr;
};

const getCardinalDirection = (degrees) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
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
                client.query(api.spots.getSpotConfig, { spotId: spot._id })
            ]);

            if (!slotsData) return;

            slotsData.forEach(slot => {
                // Enrich
                const enriched = { ...slot, spotName: spot.name, spotId: spot._id };

                // Apply Filter
                if (config) {
                    const isSpeed = slot.speed >= config.minSpeed;
                    const isGust = slot.gust >= config.minGust;

                    let isDir = false;
                    if (config.directionFrom <= config.directionTo) {
                        isDir = slot.direction >= config.directionFrom && slot.direction <= config.directionTo;
                    } else {
                        isDir = slot.direction >= config.directionFrom || slot.direction <= config.directionTo;
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
        const dayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

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

    // Sort slots within days by timestamp
    sortedDays.forEach(day => {
        grouped[day].sort((a, b) => a.timestamp - b.timestamp);
    });

    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();

    return (
        <main className="container">
            <header className="masthead">
                <h1 className="title">The Waterman Report</h1>
                <div className="dateline">
                    <span>Vol. 1</span>
                    <span>{todayStr}</span>
                    <span>Lisbon, PT</span>
                </div>
            </header>

            {sortedDays.length === 0 ? (
                <div className="empty-state">
                    NO FORECASTS TO DISPLAY AT THIS TIME.
                </div>
            ) : (
                <div className="forecast-group">
                    {sortedDays.map(day => (
                        <div key={day} className="day-block">
                            <div className="day-header sticky">{day.toUpperCase()}</div>
                            <div className="slots-list">
                                {grouped[day].map((slot) => {
                                    return (
                                        <div key={slot._id} className={`slot-row ${slot.isEpic ? 'is-epic' : ''} ${slot.isIdeal ? 'is-ideal' : ''}`}>
                                            <div className="slot-time">{slot.hour}</div>
                                            <div className="slot-spot">{slot.spotName}</div>

                                            {/* Wind */}
                                            <div className="slot-wind">
                                                <Wind size={14} className="icon-main" />
                                                <span>{Math.round(slot.speed)} <span className="gust-part">({Math.round(slot.gust)}*)</span></span>
                                            </div>

                                            {/* Wind Dir */}
                                            <div className="slot-dir wind-group">
                                                <div className="dir-item">
                                                    <div style={{ transform: `rotate(${slot.direction}deg)`, display: 'inline-block' }}>↑</div>
                                                    <span className="dir-label">{getCardinalDirection(slot.direction + 180)}</span>
                                                </div>
                                            </div>

                                            {/* Wave */}
                                            <div className="slot-wave">
                                                <Waves size={14} className="icon-main" />
                                                <span>{slot.waveHeight ? slot.waveHeight.toFixed(1) : '-'}m <span className="period">{slot.wavePeriod || 0}s</span></span>
                                            </div>

                                            {/* Wave Dir */}
                                            <div className="slot-dir wave-group">
                                                {slot.waveDirection ? (
                                                    <div className="dir-item wave-dir">
                                                        <div style={{ transform: `rotate(${slot.waveDirection}deg)`, display: 'inline-block' }}>↑</div>
                                                        <span className="dir-label">{getCardinalDirection(slot.waveDirection + 180)}</span>
                                                    </div>
                                                ) : <div className="text-gray-300">-</div>}
                                            </div>

                                            <div className="slot-epic">
                                                {slot.isEpic && (
                                                    <div className="epic-badge">
                                                        <Flame size={14} color="#8B0000" fill="#8B0000" style={{ marginRight: '4px' }} />
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
