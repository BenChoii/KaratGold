import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

const DEFAULT_GOLD_PRICE = 93.47; // fallback CAD/g

// Helper: get latest gold price from cache
async function getGoldPriceFromDb(ctx: any): Promise<number> {
    const latest = await ctx.db.query("goldPrice").order("desc").first();
    return latest?.pricePerGram ?? DEFAULT_GOLD_PRICE;
}

// Get full balance + stats for a customer
export const getBalance = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return null;

        const goldPricePerGram = await getGoldPriceFromDb(ctx);

        // Get verified submission count
        const submissions = await ctx.db
            .query("submissions")
            .withIndex("by_customer", (q) => q.eq("customerId", args.userId))
            .collect();

        const verified = submissions.filter((s) => s.status === "verified").length;
        const total = submissions.length;

        return {
            goldBalance: user.goldBalance,
            totalEarned: user.totalEarned,
            totalCashedOut: user.totalCashedOut,
            balanceCAD: +(user.goldBalance * goldPricePerGram).toFixed(2),
            totalEarnedCAD: +(user.totalEarned * goldPricePerGram).toFixed(2),
            totalCashedOutCAD: +(user.totalCashedOut * goldPricePerGram).toFixed(2),
            goldPricePerGram,
            postsVerified: verified,
            totalPosts: total,
            verificationRate: total > 0 ? Math.round((verified / total) * 100) : 0,
        };
    },
});

// Get recent gold transactions for activity feed
export const getActivity = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const transactions = await ctx.db
            .query("goldTransactions")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .order("desc")
            .take(20);

        return await Promise.all(
            transactions.map(async (tx) => {
                let businessName = "";
                if (tx.businessId) {
                    const business = await ctx.db.get(tx.businessId);
                    businessName = business?.name ?? "";
                }

                let platform = "";
                if (tx.submissionId) {
                    const submission = await ctx.db.get(tx.submissionId);
                    platform = submission?.platform ?? "";
                }

                return {
                    ...tx,
                    businessName,
                    platform,
                };
            })
        );
    },
});

// Cash out gold
export const cashOut = mutation({
    args: {
        userId: v.id("users"),
        amount: v.float64(),
        walletAddress: v.optional(v.string()),
        txSignature: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) throw new Error("User not found");
        if (user.goldBalance < args.amount) {
            throw new Error("Insufficient gold balance");
        }

        const goldPricePerGram = await getGoldPriceFromDb(ctx);

        await ctx.db.patch(args.userId, {
            goldBalance: user.goldBalance - args.amount,
            totalCashedOut: user.totalCashedOut + args.amount,
        });

        await ctx.db.insert("goldTransactions", {
            userId: args.userId,
            type: "cashout",
            amount: args.amount,
            note: args.txSignature
                ? `Cashed out ${args.amount}g on-chain (${(args.amount * goldPricePerGram).toFixed(2)} CAD)`
                : `Cashed out ${args.amount.toFixed(4)} oz (${(args.amount * goldPricePerGram).toFixed(2)} CAD)${args.walletAddress ? ` to ${args.walletAddress}` : ''}`,
            txSignature: args.txSignature,
            createdAt: Date.now(),
        });

        // Trigger the backend Solana swap & send
        if (args.walletAddress) {
            // Amount is stored in ounces, we need to convert to atomic PAXG. 
            // In a real implementation this might vary based on the token decimal configuration. 
            // Assuming 8 decimals for wrapped PAXG for this example.
            const paxgAtomic = Math.floor(args.amount * 100_000_000);

            await ctx.scheduler.runAfter(0, internal.solanaManager.swapPaxgToUsdc, {
                userId: args.userId,
                paxgAmountAtomic: paxgAtomic,
                destinationCoinbaseAddress: args.walletAddress
            });
        }

        return {
            newBalance: user.goldBalance - args.amount,
            cashedOutCAD: +(args.amount * goldPricePerGram).toFixed(2),
        };
    },
});
