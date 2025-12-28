import { mutation } from "../_generated/server";

export const addLiveReportUrls = mutation({
    args: {},
    handler: async (ctx) => {
        const spots = await ctx.db.query("spots").collect();
        
        // Live report URLs for each spot
        const liveReportUrls: Record<string, string> = {
            "Marina de Cascais": "https://www.windguru.cz/station/2329",
        };

        let updated = 0;
        for (const spot of spots) {
            const liveReportUrl = liveReportUrls[spot.name];
            if (liveReportUrl) {
                await ctx.db.patch(spot._id, {
                    liveReportUrl: liveReportUrl
                });
                updated++;
            }
        }

        return `Updated ${updated} spots with live report URLs`;
    },
});



