// ============================================================
// Payments are handled on-chain via Solana / PAXG.
// Stripe Connect has been fully removed from KaratGold.
// All payouts go through Solana PAXG transfers.
// ============================================================

import { v } from "convex/values";
import { internalMutation, query, httpAction } from "./_generated/server";

// ===== Internal Mutations =====

export const updateWithdrawalStatus = internalMutation({
    args: {
        withdrawalId: v.id("withdrawals"),
        status: v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("failed")
        ),
        cryptoTxSignature: v.optional(v.string()),
        failureReason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const patch: any = { status: args.status };
        if (args.cryptoTxSignature) patch.cryptoTxSignature = args.cryptoTxSignature;
        if (args.failureReason) patch.failureReason = args.failureReason;
        if (args.status === "completed") patch.completedAt = Date.now();
        await ctx.db.patch(args.withdrawalId, patch);
    },
});

// Query: get user's withdrawal history
export const getWithdrawals = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("withdrawals")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .order("desc")
            .take(20);
    },
});

// Webhook stub — kept so the HTTP route in http.ts doesn't break.
export const connectWebhook = httpAction(async (_ctx, _request) => {
    return new Response("Payments are handled on-chain via Solana/PAXG.", { status: 200 });
});
