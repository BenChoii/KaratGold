import { internalMutation } from "./_generated/server";

export const migrate = internalMutation({
    args: {},
    handler: async (ctx) => {
        const businesses = await ctx.db.query("businesses").collect();
        let migrated = 0;

        for (const biz of businesses) {
            const rawBiz = biz as any;
            if (rawBiz.elfsightActive !== undefined || rawBiz.elfsightWidgetId !== undefined) {
                await ctx.db.patch(biz._id, {
                    embedSocialActive: rawBiz.elfsightActive,
                    embedSocialWidgetId: rawBiz.elfsightWidgetId,
                    embedSocialActivatedAt: rawBiz.elfsightActivatedAt,
                    // Note: Convex patch preserves extra fields unless explicitly undefined
                    // we'll explicitly remove the old ones or just leave them as un-indexed
                });
                migrated++;
            }
        }
        return `Migrated ${migrated} businesses to EmbedSocial fields.`;
    },
});
