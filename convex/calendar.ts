import { query } from "./_generated/server";
import { v } from "convex/values";

export const getIdealSlots = query({
    args: {
        sports: v.optional(v.array(v.string())), // Default sports to include
    },
    handler: async (ctx, args) => {
        const sports = args.sports || ["wingfoil"];
        const today = Date.now();
        
        // Get all spots that match the sports
        const allSpots = await ctx.db.query("spots").collect();
        const matchingSpots = allSpots.filter(spot => {
            const spotSports = spot.sports || [];
            return spotSports.length > 0 && spotSports.some(sport => sports.includes(sport));
        });

        // Get all forecast slots for matching spots
        const allSlots = [];
        for (const spot of matchingSpots) {
            const slots = await ctx.db
                .query("forecast_slots")
                .withIndex("by_spot", q => q.eq("spotId", spot._id))
                .filter(q => q.gte(q.field("timestamp"), today))
                .collect();
            
            for (const slot of slots) {
                allSlots.push({
                    ...slot,
                    spot: spot,
                });
            }
        }

        // Get spot configs for each spot
        const slotsWithConfigs = await Promise.all(
            allSlots.map(async (slot) => {
                // Get config for each sport the spot supports
                const configs = [];
                for (const sport of slot.spot.sports || []) {
                    if (sports.includes(sport)) {
                        const config = await ctx.db
                            .query("spotConfigs")
                            .filter(q => 
                                q.and(
                                    q.eq(q.field("spotId"), slot.spot._id),
                                    q.eq(q.field("sport"), sport)
                                )
                            )
                            .first();
                        if (config) {
                            configs.push({ ...config, sport });
                        }
                    }
                }
                return {
                    ...slot,
                    configs,
                };
            })
        );

        // Determine which slots match criteria and which are ideal
        const slotsByDayAndSpot: Record<string, Record<string, typeof slotsWithConfigs>> = {};
        
        slotsWithConfigs.forEach(slot => {
            const date = new Date(slot.timestamp);
            date.setHours(0, 0, 0, 0);
            const dayKey = date.toISOString();
            const spotId = slot.spot._id;
            
            if (!slotsByDayAndSpot[dayKey]) {
                slotsByDayAndSpot[dayKey] = {};
            }
            if (!slotsByDayAndSpot[dayKey][spotId]) {
                slotsByDayAndSpot[dayKey][spotId] = [];
            }
            
            // Check if slot matches criteria
            let matchesCriteria = false;
            let matchedSport = null;
            
            for (const config of slot.configs) {
                if (config.sport === "wingfoil") {
                    const isSpeed = slot.speed >= (config.minSpeed || 0);
                    const isGust = slot.gust >= (config.minGust || 0);
                    let isDir = true;
                    if (config.directionFrom !== undefined && config.directionTo !== undefined) {
                        if (config.directionFrom <= config.directionTo) {
                            isDir = slot.direction >= config.directionFrom && slot.direction <= config.directionTo;
                        } else {
                            isDir = slot.direction >= config.directionFrom || slot.direction <= config.directionTo;
                        }
                    }
                    if (isSpeed && isGust && isDir) {
                        matchesCriteria = true;
                        matchedSport = "wingfoil";
                        break;
                    }
                } else if (config.sport === "surfing") {
                    const hasSwell = (slot.waveHeight || 0) >= (config.minSwellHeight || 0);
                    const hasPeriod = (slot.wavePeriod || 0) >= (config.minPeriod || 0);
                    let isDir = true;
                    if (config.swellDirectionFrom !== undefined && config.swellDirectionTo !== undefined) {
                        if (config.swellDirectionFrom <= config.swellDirectionTo) {
                            isDir = (slot.waveDirection || 0) >= config.swellDirectionFrom && 
                                   (slot.waveDirection || 0) <= config.swellDirectionTo;
                        } else {
                            isDir = (slot.waveDirection || 0) >= config.swellDirectionFrom || 
                                   (slot.waveDirection || 0) <= config.swellDirectionTo;
                        }
                    }
                    if (hasSwell && hasPeriod && isDir) {
                        matchesCriteria = true;
                        matchedSport = "surfing";
                        break;
                    }
                }
            }
            
            slotsByDayAndSpot[dayKey][spotId].push({
                ...slot,
                matchesCriteria,
                matchedSport,
            });
        });

        // Find ideal slots (max speed for wingfoil, best conditions for surfing)
        const idealSlots = [];
        Object.keys(slotsByDayAndSpot).forEach(dayKey => {
            Object.keys(slotsByDayAndSpot[dayKey]).forEach(spotId => {
                const slots = slotsByDayAndSpot[dayKey][spotId];
                const matchingSlots = slots.filter(s => s.matchesCriteria);
                
                if (matchingSlots.length > 0) {
                    // For wingfoil, find max speed; for surfing, find best swell
                    const idealSlot = matchingSlots.reduce((best, current) => {
                        if (current.matchedSport === "wingfoil") {
                            return (current.speed || 0) > (best.speed || 0) ? current : best;
                        } else if (current.matchedSport === "surfing") {
                            const currentScore = (current.waveHeight || 0) * (current.wavePeriod || 0);
                            const bestScore = (best.waveHeight || 0) * (best.wavePeriod || 0);
                            return currentScore > bestScore ? current : best;
                        }
                        return best;
                    });
                    
                    idealSlots.push(idealSlot);
                }
            });
        });

        return idealSlots.sort((a, b) => a.timestamp - b.timestamp);
    },
});

