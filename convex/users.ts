import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";

// Get or create a user from wallet address
export const getOrCreate = mutation({
    args: {
        walletAddress: v.string(),
        name: v.string(),
        email: v.string(),
        avatarUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("users")
            .withIndex("by_wallet_address", (q) => q.eq("walletAddress", args.walletAddress))
            .unique();

        if (existing) {
            return existing._id;
        }

        const userId = await ctx.db.insert("users", {
            walletAddress: args.walletAddress,
            name: args.name,
            email: args.email,
            avatarUrl: args.avatarUrl,
            role: "pending",
            goldBalance: 0,
            totalEarned: 0,
            totalCashedOut: 0,
            custodialWalletAddress: args.walletAddress,
            createdAt: Date.now(),
        });

        return userId;
    },
});

// Get user by wallet address
export const getByWalletAddress = query({
    args: { walletAddress: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_wallet_address", (q) => q.eq("walletAddress", args.walletAddress))
            .unique();
    },
});

// Get user by ID
export const getById = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});

// Internal function to get the secure auto-generated wallet keys (DO NOT EXPOSE TO FRONTEND)
export const getWalletKeys = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("walletKeys")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();
    },
});

// Update user role
export const updateRole = mutation({
    args: {
        userId: v.id("users"),
        role: v.union(v.literal("customer"), v.literal("business"), v.literal("pending")),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, { role: args.role });
    },
});
