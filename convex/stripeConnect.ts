import { v } from "convex/values";
import { internalMutation, query, httpAction } from "./_generated/server";

// ============================================================
// Stripe Connect has been removed. All payouts now go through
// Solana / PAXG transfers. The functions below are kept as
// stubs so that existing references (schema, admin, etc.)
// continue to compile while the migration is in progress.
// ============================================================

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
        stripeTransferId: v.optional(v.string()),
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

// Webhook stub — no longer processes Stripe events.
// Kept so the HTTP route in http.ts doesn't break during migration.
export const connectWebhook = httpAction(async (_ctx, _request) => {
    return new Response("Stripe Connect webhook disabled — payouts are now via Solana/PAXG.", { status: 200 });
});
