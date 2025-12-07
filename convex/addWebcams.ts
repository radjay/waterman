import { mutation } from "./_generated/server";

export const addWebcamUrls = mutation({
    args: {},
    handler: async (ctx) => {
        const spots = await ctx.db.query("spots").collect();
        
        // Webcam data from portufornia repo
        // For quanteec: URL format is https://deliverys5.quanteec.com/contents/encodings/live/{streamId}/media_0.m3u8
        // For iol: streamId is already the full URL
        const webcamData: Record<string, { url: string; source: string }> = {
            "Marina de Cascais": {
                url: "https://video-auth1.iol.pt/beachcam/praiadospescadores/playlist.m3u8",
                source: "iol"
            },
            "Lagoa da Albufeira": {
                url: "https://video-auth1.iol.pt/beachcam/bclagoaalbufeira/playlist.m3u8",
                source: "iol"
            },
            "Carcavelos": {
                url: "https://deliverys5.quanteec.com/contents/encodings/live/7dbfbd58-2c72-4c87-3135-3530-6d61-63-a1b9-8dc2ff272a5cd/media_0.m3u8",
                source: "quanteec"
            },
        };

        let updated = 0;
        for (const spot of spots) {
            const webcam = webcamData[spot.name];
            if (webcam) {
                await ctx.db.patch(spot._id, {
                    webcamUrl: webcam.url,
                    webcamStreamSource: webcam.source
                });
                updated++;
            }
        }

        return `Updated ${updated} spots with webcam URLs`;
    },
});

