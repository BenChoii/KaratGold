/**
 * convex/solana.ts — Convex ↔ Solana Bridge
 *
 * Server-side actions that connect the off-chain Convex system to
 * the on-chain KARAT escrow program. These actions are called by the
 * frontend after wallet transactions, or scheduled by mutations after
 * AI verification approves a submission.
 *
 * Architecture:
 * - Frontend constructs + signs transactions via wallet adapter
 * - Frontend calls these mutations to record on-chain state in Convex
 * - Oracle payouts use a server-side keypair stored in env secrets
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ========================================================================
// MUTATIONS — record on-chain events in Convex
// ========================================================================

/**
 * Link a Solana wallet address to a user.
 * Called after the user connects their wallet in the frontend.
 */
export const linkWallet = mutation({
    args: {
        currentWalletAddress: v.string(),
        walletAddress: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_wallet_address", (q) => q.eq("walletAddress", args.currentWalletAddress))
            .unique();

        if (!user) throw new Error("User not found");

        await ctx.db.patch(user._id, { walletAddress: args.walletAddress });

        // If user is a business owner, also link to the business
        if (user.role === "business") {
            const business = await ctx.db
                .query("businesses")
                .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
                .first();
            if (business) {
                await ctx.db.patch(business._id, { walletAddress: args.walletAddress });
            }
        }

        return { success: true };
    },
});

/**
 * Record a campaign escrow creation on-chain.
 * Called after the frontend creates the escrow PDA.
 */
export const recordEscrowCreated = mutation({
    args: {
        campaignId: v.id("campaigns"),
        escrowAddress: v.string(),
        txSignature: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.campaignId, {
            escrowAddress: args.escrowAddress,
            onChainTxSignature: args.txSignature,
        });
        return { success: true };
    },
});

/**
 * Record a campaign funding transaction on-chain.
 * Called after the business signs the fund_campaign instruction.
 */
export const recordCampaignFunded = mutation({
    args: {
        campaignId: v.id("campaigns"),
        amountGrams: v.float64(),
        txSignature: v.string(),
    },
    handler: async (ctx, args) => {
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        const currentFunded = campaign.escrowFunded ?? 0;
        await ctx.db.patch(args.campaignId, {
            escrowFunded: currentFunded + args.amountGrams,
            onChainTxSignature: args.txSignature,
        });

        // Also record in gold transactions for audit trail
        const business = await ctx.db.get(campaign.businessId);
        if (business) {
            await ctx.db.insert("goldTransactions", {
                userId: business.ownerId,
                type: "fund",
                amount: args.amountGrams,
                businessId: campaign.businessId,
                note: `On-chain fund: ${args.txSignature.slice(0, 16)}...`,
                txSignature: args.txSignature,
                createdAt: Date.now(),
            });
        }

        return { success: true };
    },
});

/**
 * Record an on-chain payout to a customer.
 * Called after the oracle signs the approve_payout instruction.
 */
export const recordPayout = mutation({
    args: {
        submissionId: v.id("submissions"),
        customerUserId: v.id("users"),
        amountGrams: v.float64(),
        txSignature: v.string(),
    },
    handler: async (ctx, args) => {
        // Record in gold transactions
        await ctx.db.insert("goldTransactions", {
            userId: args.customerUserId,
            type: "earn",
            amount: args.amountGrams,
            submissionId: args.submissionId,
            note: `On-chain payout: ${args.txSignature.slice(0, 16)}...`,
            txSignature: args.txSignature,
            createdAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Record a refund from escrow back to business.
 */
export const recordRefund = mutation({
    args: {
        campaignId: v.id("campaigns"),
        amountGrams: v.float64(),
        txSignature: v.string(),
    },
    handler: async (ctx, args) => {
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        const currentFunded = campaign.escrowFunded ?? 0;
        await ctx.db.patch(args.campaignId, {
            escrowFunded: Math.max(0, currentFunded - args.amountGrams),
            onChainTxSignature: args.txSignature,
        });

        const business = await ctx.db.get(campaign.businessId);
        if (business) {
            await ctx.db.insert("goldTransactions", {
                userId: business.ownerId,
                type: "fund",
                amount: -args.amountGrams, // Negative = refund
                businessId: campaign.businessId,
                note: `On-chain refund: ${args.txSignature.slice(0, 16)}...`,
                txSignature: args.txSignature,
                createdAt: Date.now(),
            });
        }

        return { success: true };
    },
});

// ========================================================================
// QUERIES — read on-chain state from Convex
// ========================================================================

/**
 * Get the wallet address linked to a user.
 */
export const getWalletAddress = query({
    args: { walletAddress: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_wallet_address", (q) => q.eq("walletAddress", args.walletAddress))
            .unique();
        return user?.walletAddress ?? null;
    },
});

/**
 * Get the escrow status for a campaign.
 */
export const getCampaignEscrow = query({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) return null;
        return {
            escrowAddress: campaign.escrowAddress ?? null,
            escrowFunded: campaign.escrowFunded ?? 0,
            lastTxSignature: campaign.onChainTxSignature ?? null,
        };
    },
});
