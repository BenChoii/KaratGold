import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// List all active campaigns (for customer explore)
export const listActive = query({
    args: {
        search: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let campaigns = await ctx.db
            .query("campaigns")
            .withIndex("by_status", (q) => q.eq("status", "active"))
            .collect();

        // Enrich with business data
        const enriched = await Promise.all(
            campaigns.map(async (campaign) => {
                const business = await ctx.db.get(campaign.businessId);
                return {
                    ...campaign,
                    businessName: business?.name ?? "Unknown",
                    businessCategory: business?.category ?? "",
                    businessLocation: business?.location ?? "",
                    remaining: campaign.maxSubmissions - campaign.currentSubmissions,
                    verificationMethod: campaign.verificationMethod ?? (business?.verificationTier === "auto" ? "auto" : "manual"),
                };
            })
        );

        // Filter by search if provided
        if (args.search) {
            const s = args.search.toLowerCase();
            return enriched.filter(
                (c) =>
                    c.businessName.toLowerCase().includes(s) ||
                    c.businessCategory.toLowerCase().includes(s) ||
                    c.businessLocation.toLowerCase().includes(s) ||
                    c.title.toLowerCase().includes(s)
            );
        }

        return enriched;
    },
});

// Get single campaign by ID
export const getById = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) return null;

        const business = await ctx.db.get(campaign.businessId);
        return {
            ...campaign,
            businessName: business?.name ?? "Unknown",
            businessCategory: business?.category ?? "",
            businessLocation: business?.location ?? "",
            remaining: campaign.maxSubmissions - campaign.currentSubmissions,
        };
    },
});

// List campaigns by business (for dashboard)
export const listByBusiness = query({
    args: { businessId: v.id("businesses") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("campaigns")
            .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
            .collect();
    },
});

// Create a campaign
export const create = mutation({
    args: {
        businessId: v.id("businesses"),
        title: v.string(),
        description: v.string(),
        rewardGrams: v.float64(),
        maxSubmissions: v.number(),
        platforms: v.array(v.string()),
        requirements: v.array(v.string()),
        verificationMethod: v.optional(v.union(v.literal("auto"), v.literal("manual"))),
    },
    handler: async (ctx, args) => {
        const business = await ctx.db.get(args.businessId);
        if (!business) throw new Error("Business not found");

        // Get current gold price for reference
        const goldPrice = await ctx.db.query("goldPrice").order("desc").first();
        const pricePerOunce = goldPrice?.paxgUsd ?? 2900;

        const rewardGrams = args.rewardGrams;
        const goldPriceAtCreation = pricePerOunce;

        // Enforce minimum reward: 0.001 oz per post
        if (rewardGrams < 0.001) {
            throw new Error(
                `Minimum reward is 0.001 oz/post. Current reward: ${rewardGrams} oz.`
            );
        }

        // Calculate budget in gold ounces
        const budgetGrams = rewardGrams * args.maxSubmissions;

        // Enforce minimum campaign budget: 0.01 oz
        if (budgetGrams < 0.01) {
            throw new Error(
                `Minimum campaign budget is 0.01 oz. ` +
                `Current budget: ${budgetGrams.toFixed(5)} oz (${args.maxSubmissions} posts x ${rewardGrams} oz/post). ` +
                `Increase reward per post or number of posts.`
            );
        }

        // Calculate 20% platform fee
        const feeGrams = Math.round(budgetGrams * 0.20 * 100000) / 100000;
        const totalGramsNeeded = budgetGrams + feeGrams;

        // Check gold pool covers budget + fee
        if (business.goldPool < totalGramsNeeded) {
            const shortfall = totalGramsNeeded - business.goldPool;
            throw new Error(
                `Insufficient gold in pool. ` +
                `Budget: ${budgetGrams.toFixed(5)} oz + ` +
                `Fee: ${feeGrams.toFixed(5)} oz = ` +
                `${totalGramsNeeded.toFixed(5)} oz total needed. ` +
                `You need ${shortfall.toFixed(5)} oz more. Fund your pool first.`
            );
        }

        // Deduct budget + fee from pool
        await ctx.db.patch(args.businessId, {
            goldPool: business.goldPool - totalGramsNeeded,
            totalPlatformFees: (business.totalPlatformFees ?? 0) + feeGrams,
        });

        // Add 20% protocol fee directly to the global KaratTreasury internal ledger
        const treasuryQuery = await ctx.db.query("karatTreasury")
            .withIndex("by_asset", (q) => q.eq("assetType", "paxg"))
            .first();

        if (treasuryQuery) {
            await ctx.db.patch(treasuryQuery._id, {
                balance: treasuryQuery.balance + feeGrams,
                totalCollected: treasuryQuery.totalCollected + feeGrams,
                lastUpdated: Date.now(),
            });
        } else {
            await ctx.db.insert("karatTreasury", {
                assetType: "paxg",
                balance: feeGrams,
                totalCollected: feeGrams,
                totalSwapped: 0,
                lastUpdated: Date.now(),
            });
        }

        // Record platform fee transaction
        await ctx.db.insert("goldTransactions", {
            userId: business.ownerId,
            type: "platform_fee",
            amount: feeGrams,
            businessId: args.businessId,
            note: `Platform fee: ${feeGrams.toFixed(5)} oz — 20% of ${budgetGrams.toFixed(5)} oz campaign budget`,
            createdAt: Date.now(),
        });

        // Activate EmbedSocial on first campaign
        if (!business.embedSocialActive) {
            await ctx.db.patch(args.businessId, {
                embedSocialActive: true,
                embedSocialActivatedAt: Date.now(),
            });
        }

        const campaignId = await ctx.db.insert("campaigns", {
            businessId: args.businessId,
            title: args.title,
            description: args.description,
            rewardGrams,
            maxSubmissions: args.maxSubmissions,
            platforms: args.platforms,
            requirements: args.requirements,
            currentSubmissions: 0,
            status: "active",
            goldPriceAtCreation,
            platformFee: feeGrams,
            verificationMethod: args.verificationMethod ?? (business.verificationTier === "auto" ? "auto" : "manual"),
            createdAt: Date.now(),
        });

        return campaignId;
    },
});

// Pause / resume campaign
export const togglePause = mutation({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        const newStatus = campaign.status === "active" ? "paused" : "active";
        await ctx.db.patch(args.campaignId, { status: newStatus });
        return { status: newStatus };
    },
});

// Get Karat treasury data
export const getKaratTreasury = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("karatTreasury")
            .withIndex("by_asset", (q) => q.eq("assetType", "paxg"))
            .first();
    },
});
