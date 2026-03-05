import { mutation, query } from "./_generated/server";

export const wipe = mutation({
  handler: async (ctx) => {
    const campaigns = await ctx.db.query("campaigns").collect();
    let count = 0;
    for (const c of campaigns) {
      await ctx.db.delete(c._id);
      count++;
    }
    return `Deleted ${count} campaigns.`;
  },
});

export const get = query({
  handler: async (ctx) => {
    return await ctx.db.query("campaigns").collect();
  }
});
