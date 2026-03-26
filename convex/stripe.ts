import { v } from "convex/values";
import { httpAction, internalMutation } from "./_generated/server";

// ============================================================
// Stripe checkout has been removed. Campaign funding now
// happens via direct PAXG transfer to the escrow Solana wallet.
// The fulfillFunding mutation is retained so it can be called
// by an on-chain listener / webhook when a PAXG deposit is
// confirmed.
// ============================================================

// Called when a PAXG deposit to the escrow wallet is confirmed on-chain
export const fulfillFunding = internalMutation({
    args: {
        businessId: v.id("businesses"),
        cadAmountPaid: v.number(),
    },
    handler: async (ctx, args) => {
        const business = await ctx.db.get(args.businessId);
        if (!business) throw new Error("Business not found");

        const goldPrice = await ctx.db.query("goldPrice").order("desc").first();
        const pricePerOunce = goldPrice?.paxgCad ?? 2900;

        const ouncesAdded = Math.round((args.cadAmountPaid / pricePerOunce) * 100000) / 100000;

        await ctx.db.patch(args.businessId, {
            goldPool: business.goldPool + ouncesAdded,
            totalGoldFunded: business.totalGoldFunded + ouncesAdded,
            cadBalance: (business.cadBalance ?? 0) + args.cadAmountPaid,
        });

        await ctx.db.insert("goldTransactions", {
            userId: business.ownerId,
            businessId: args.businessId,
            type: "fund",
            amount: ouncesAdded,
            note: `Funded $${args.cadAmountPaid.toFixed(2)} CAD via PAXG deposit (${ouncesAdded} oz)`,
            createdAt: Date.now(),
        });
    },
});

// Webhook stub — no longer processes Stripe events.
// Kept so the HTTP route in http.ts doesn't break during migration.
export const stripeWebhook = httpAction(async (_ctx, _request) => {
    return new Response("Stripe webhook disabled — funding is now via Solana/PAXG.", { status: 200 });
});
