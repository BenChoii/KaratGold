import { v } from "convex/values";
import { action, internalMutation, query, httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

function getStripe() {
    return new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2024-12-18.acacia" as any,
    });
}

// Create a Stripe Connect Express account for a user
export const createConnectAccount = action({
    args: {
        userId: v.id("users"),
        email: v.string(),
        returnUrl: v.string(),
        refreshUrl: v.string(),
    },
    handler: async (ctx, args) => {
        const stripe = getStripe();

        // Create the Express account
        const account = await stripe.accounts.create({
            type: "express",
            country: "CA",
            email: args.email,
            capabilities: {
                transfers: { requested: true },
            },
            metadata: {
                userId: args.userId,
                platform: "karatgold",
            },
        });

        // Save the account ID to the user record
        await ctx.runMutation(internal.stripeConnect.saveConnectAccountId, {
            userId: args.userId,
            accountId: account.id,
        });

        // Create the onboarding link
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: args.refreshUrl,
            return_url: args.returnUrl,
            type: "account_onboarding",
        });

        return accountLink.url;
    },
});

// Generate a new onboarding link for an existing account
export const createOnboardingLink = action({
    args: {
        stripeAccountId: v.string(),
        returnUrl: v.string(),
        refreshUrl: v.string(),
    },
    handler: async (_ctx, args) => {
        const stripe = getStripe();
        const accountLink = await stripe.accountLinks.create({
            account: args.stripeAccountId,
            refresh_url: args.refreshUrl,
            return_url: args.returnUrl,
            type: "account_onboarding",
        });
        return accountLink.url;
    },
});

// Check if onboarding is complete
export const checkOnboardingStatus = action({
    args: { stripeAccountId: v.string() },
    handler: async (ctx, args) => {
        const stripe = getStripe();
        const account = await stripe.accounts.retrieve(args.stripeAccountId);

        const isOnboarded = account.charges_enabled && account.payouts_enabled;

        if (isOnboarded && account.metadata?.userId) {
            await ctx.runMutation(internal.stripeConnect.markOnboarded, {
                userId: account.metadata.userId as any,
                onboarded: true,
            });
        }

        return {
            onboarded: isOnboarded,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
        };
    },
});

// Create a payout (transfer from platform to connected account)
export const createPayout = action({
    args: {
        userId: v.id("users"),
        withdrawalId: v.id("withdrawals"),
        stripeAccountId: v.string(),
        cadAmount: v.number(),
    },
    handler: async (ctx, args) => {
        const stripe = getStripe();

        try {
            const transfer = await stripe.transfers.create({
                amount: Math.round(args.cadAmount * 100), // cents
                currency: "cad",
                destination: args.stripeAccountId,
                metadata: {
                    userId: args.userId,
                    withdrawalId: args.withdrawalId,
                    platform: "karatgold",
                },
            });

            // Mark withdrawal as completed
            await ctx.runMutation(internal.stripeConnect.updateWithdrawalStatus, {
                withdrawalId: args.withdrawalId,
                status: "completed",
                stripeTransferId: transfer.id,
            });

            return { success: true, transferId: transfer.id };
        } catch (err: any) {
            // Mark withdrawal as failed
            await ctx.runMutation(internal.stripeConnect.updateWithdrawalStatus, {
                withdrawalId: args.withdrawalId,
                status: "failed",
                failureReason: err.message,
            });

            throw new Error(`Payout failed: ${err.message}`);
        }
    },
});

// Get the Stripe Express dashboard login link for a connected account
export const getExpressDashboardLink = action({
    args: { stripeAccountId: v.string() },
    handler: async (_ctx, args) => {
        const stripe = getStripe();
        const link = await stripe.accounts.createLoginLink(args.stripeAccountId);
        return link.url;
    },
});

// ===== Internal Mutations =====

export const saveConnectAccountId = internalMutation({
    args: {
        userId: v.id("users"),
        accountId: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            stripeConnectAccountId: args.accountId,
            stripeConnectOnboarded: false,
        });
    },
});

export const markOnboarded = internalMutation({
    args: {
        userId: v.id("users"),
        onboarded: v.boolean(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            stripeConnectOnboarded: args.onboarded,
        });
    },
});

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
        failureReason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const patch: any = { status: args.status };
        if (args.stripeTransferId) patch.stripeTransferId = args.stripeTransferId;
        if (args.failureReason) patch.failureReason = args.failureReason;
        if (args.status === "completed") patch.completedAt = Date.now();
        await ctx.db.patch(args.withdrawalId, patch);
    },
});

// Query: get user's Connect status
export const getConnectStatus = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return null;
        return {
            hasAccount: !!user.stripeConnectAccountId,
            accountId: user.stripeConnectAccountId,
            onboarded: user.stripeConnectOnboarded ?? false,
            payoutMethod: user.stripePayoutMethod ?? "bank",
        };
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

// Webhook handler for Connect account updates
export const connectWebhook = httpAction(async (ctx, request) => {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature") as string;

    try {
        const stripe = getStripe();
        const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

        let event: Stripe.Event;
        if (webhookSecret) {
            event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        } else {
            event = JSON.parse(payload) as Stripe.Event;
        }

        if (event.type === "account.updated") {
            const account = event.data.object as Stripe.Account;
            if (account.metadata?.userId && account.charges_enabled && account.payouts_enabled) {
                await ctx.runMutation(internal.stripeConnect.markOnboarded, {
                    userId: account.metadata.userId as any,
                    onboarded: true,
                });
            }
        }

        return new Response("OK", { status: 200 });
    } catch (err: any) {
        console.error("Connect webhook error:", err.message);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
});
