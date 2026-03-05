import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Keypair } from "@solana/web3.js";

// Create a new business
export const create = mutation({
    args: {
        ownerId: v.id("users"),
        name: v.string(),
        category: v.string(),
        location: v.string(),
        latitude: v.optional(v.float64()),
        longitude: v.optional(v.float64()),
        locationType: v.optional(v.union(v.literal("physical"), v.literal("service_area"))),
        serviceAreas: v.optional(v.array(v.string())),
        instagramHandle: v.optional(v.string()),
        facebookHandle: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Update user role to business
        await ctx.db.patch(args.ownerId, { role: "business" });

        // Auto-generate a custodial Solana wallet for the business entity
        const keypair = Keypair.generate();
        const walletAddress = keypair.publicKey.toBase58();
        const encodedPrivateKey = Array.from(keypair.secretKey)
            .map((b) => String.fromCharCode(b))
            .join("");

        const businessId = await ctx.db.insert("businesses", {
            ownerId: args.ownerId,
            name: args.name,
            category: args.category,
            location: args.location,
            latitude: args.latitude,
            longitude: args.longitude,
            locationType: args.locationType ?? "physical",
            serviceAreas: args.serviceAreas,
            instagramHandle: args.instagramHandle,
            facebookHandle: args.facebookHandle,
            goldPool: 0,
            totalGoldFunded: 0,
            custodialWalletAddress: walletAddress,
            createdAt: Date.now(),
        });

        // Store private key separately (using ownerId for generic reference, though it's technically a business wallet)
        // Note: The walletKeys table uses userId, so we link the business wallet to the owner.
        await ctx.db.insert("walletKeys", {
            userId: args.ownerId,
            publicKey: walletAddress,
            encryptedPrivateKey: encodedPrivateKey,
            createdAt: Date.now(),
        });

        return businessId;
    },
});

// Get business by owner user ID
export const getByOwner = query({
    args: { ownerId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("businesses")
            .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
            .first();
    },
});

// Get business by ID (public — used by scan page)
export const getById = query({
    args: { businessId: v.id("businesses") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.businessId);
    },
});

// Update business details
export const update = mutation({
    args: {
        businessId: v.id("businesses"),
        name: v.optional(v.string()),
        category: v.optional(v.string()),
        location: v.optional(v.string()),
        instagramHandle: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { businessId, ...updates } = args;
        const filtered = Object.fromEntries(
            Object.entries(updates).filter(([, v]) => v !== undefined)
        );
        await ctx.db.patch(businessId, filtered);
    },
});

// Fund gold pool (supports both gold and CAD)
export const fundPool = mutation({
    args: {
        businessId: v.id("businesses"),
        amount: v.float64(),
        currency: v.optional(v.union(v.literal("gold"), v.literal("cad"))),
    },
    handler: async (ctx, args) => {
        const business = await ctx.db.get(args.businessId);
        if (!business) throw new Error("Business not found");

        const mode = args.currency ?? "gold";
        let goldGrams = args.amount;
        let cadAmount = 0;

        if (mode === "cad") {
            // Convert CAD to gold ounces using live price
            const goldPrice = await ctx.db.query("goldPrice").order("desc").first();
            const pricePerOunce = goldPrice?.paxgCad ?? 7384;
            goldGrams = Math.round((args.amount / pricePerOunce) * 100000) / 100000;
            cadAmount = args.amount;
        }

        await ctx.db.patch(args.businessId, {
            goldPool: business.goldPool + goldGrams,
            totalGoldFunded: business.totalGoldFunded + goldGrams,
            cadBalance: (business.cadBalance ?? 0) + cadAmount,
        });

        // Record the transaction
        const note = mode === "cad"
            ? `Funded $${args.amount.toFixed(2)} CAD (≈ ${goldGrams.toFixed(5)}oz) to ${business.name}`
            : `Funded ${args.amount}oz to ${business.name}`;

        await ctx.db.insert("goldTransactions", {
            userId: business.ownerId,
            type: "fund",
            amount: goldGrams,
            businessId: args.businessId,
            note,
            createdAt: Date.now(),
        });

        return { newPool: business.goldPool + goldGrams, goldGrams, cadAmount };
    },
});

// Keep backward compatibility alias
export const fundGold = fundPool;

