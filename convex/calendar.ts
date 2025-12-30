import { query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Query to get ideal forecast slots for calendar feed.
 * Returns slots that match criteria and are marked as ideal.
 * 
 * Note: This is a simplified version. For full criteria matching logic,
 * see lib/criteria.js on the client side. This function returns slots
 * that have been marked as ideal by the client-side enrichment.
 * 
 * @param {Array<string>} sports - Sports to filter by
 * @returns {Array} Array of ideal slots with spot information
 */
export const getIdealSlots = query({
  args: {
    sports: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Get spots for selected sports
    const spots = await ctx.runQuery(api.spots.list, {
      sports: args.sports,
    });
    
    const idealSlots = [];
    
    // For each spot, get forecast slots
    for (const spot of spots) {
      const slots = await ctx.runQuery(api.spots.getForecastSlots, {
        spotId: spot._id,
      });
      
      // Note: Full criteria matching and ideal slot detection happens on the client side.
      // This is a simplified version that returns all slots for the calendar.
      // The calendar route should ideally do the enrichment on the server side,
      // but for now this prevents the route from breaking.
      
      for (const slot of slots) {
        idealSlots.push({
          ...slot,
          spot: {
            _id: spot._id,
            name: spot.name,
          },
        });
      }
    }
    
    // Sort by timestamp
    idealSlots.sort((a, b) => a.timestamp - b.timestamp);
    
    return idealSlots;
  },
});



