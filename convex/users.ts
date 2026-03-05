import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { Keypair } from "@solana/web3.js";

// Get or create a user from Clerk identity
export const getOrCreate = mutation({
    args: {
        clerkId: v.string(),
        name: v.string(),
        email: v.string(),
        avatarUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (existing) {
            // Retroactive migration for users who signed up before custodial wallets
            if (!existing.custodialWalletAddress) {
                const keypair = Keypair.generate();
                const newWalletAddress = keypair.publicKey.toBase58();
                const encodedPrivateKey = Array.from(keypair.secretKey)
                    .map((b) => String.fromCharCode(b))
                    .join("");

                await ctx.db.patch(existing._id, {
                    custodialWalletAddress: newWalletAddress,
                });

                await ctx.db.insert("walletKeys", {
                    userId: existing._id,
                    publicKey: newWalletAddress,
                    encryptedPrivateKey: encodedPrivateKey,
                    createdAt: Date.now(),
                });
            }
            return existing._id;
        }

        // Auto-generate a custodial Solana wallet for the user
        const keypair = Keypair.generate();
        const walletAddress = keypair.publicKey.toBase58();
        const encodedPrivateKey = Array.from(keypair.secretKey)
            .map((b) => String.fromCharCode(b))
            .join("");

        const userId = await ctx.db.insert("users", {
            clerkId: args.clerkId,
            name: args.name,
            email: args.email,
            avatarUrl: args.avatarUrl,
            role: "pending",
            goldBalance: 0,
            totalEarned: 0,
            totalCashedOut: 0,
            walletAddress: walletAddress, // Set initial visible address as the custodial one too
            custodialWalletAddress: walletAddress,
            createdAt: Date.now(),
        });

        // Store private key separately (never exposed to client)
        await ctx.db.insert("walletKeys", {
            userId,
            publicKey: walletAddress,
            encryptedPrivateKey: encodedPrivateKey,
            createdAt: Date.now(),
        });

        return userId;
    },
});

// Get user by Clerk ID
export const getByClerkId = query({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
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
