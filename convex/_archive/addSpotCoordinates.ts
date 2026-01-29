import { mutation } from "../_generated/server";

/**
 * One-off mutation to add coordinates to the 4 forecast spots missing them.
 * 
 * Coordinates from PRD 06:
 * - Marina de Cascais: 38.6919, -9.4203
 * - Lagoa da Albufeira: 38.5058, -9.1728
 * - Carcavelos: 38.6775, -9.3383
 * - Praia do Guincho: 38.7333, -9.4733
 */
export const addSpotCoordinates = mutation({
    args: {},
    handler: async (ctx) => {
        const spots = await ctx.db.query("spots").collect();
        
        const updates = [
            { name: "Marina de Cascais", latitude: 38.6919, longitude: -9.4203 },
            { name: "Lagoa da Albufeira", latitude: 38.5058, longitude: -9.1728 },
            { name: "Carcavelos", latitude: 38.6775, longitude: -9.3383 },
            { name: "Praia do Guincho", latitude: 38.7333, longitude: -9.4733 },
        ];

        let updated = 0;
        for (const update of updates) {
            const spot = spots.find(s => s.name === update.name);
            if (spot) {
                await ctx.db.patch(spot._id, {
                    latitude: update.latitude,
                    longitude: update.longitude,
                });
                updated++;
                console.log(`Updated ${update.name} with coordinates: ${update.latitude}, ${update.longitude}`);
            } else {
                console.log(`Spot ${update.name} not found`);
            }
        }

        return `Updated ${updated} spots with coordinates`;
    },
});
