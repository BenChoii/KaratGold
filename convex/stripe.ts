import { v } from "convex/values";
import { action, httpAction, internalAction, internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

export const createCheckoutSession = action({
    args: {
        businessId: v.id("businesses"),
        cadAmount: v.number(),
        successUrl: v.string(),
        cancelUrl: v.string(),
    },
    handler: async (ctx, args) => {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2024-12-18.acacia" as any,
        });

        // Enforce $100 CAD minimum
        if (args.cadAmount < 100) {
            throw new Error("Minimum funding amount is $100 CAD");
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card", "link"],
            mode: "payment",
            metadata: {
                businessId: args.businessId,
                type: "fund_gold_pool",
            },
            line_items: [
                {
                    price_data: {
                        currency: "cad",
                        product_data: {
                            name: "Karat Gold Budget Funding",
                            description: "Funds added to your account's gold pool for campaign rewards.",
                        },
                        unit_amount: Math.round(args.cadAmount * 100), // Stripe expects cents
                    },
                    quantity: 1,
                },
            ],
            success_url: args.successUrl,
            cancel_url: args.cancelUrl,
        });

        if (!session.url) {
            throw new Error("Failed to create Stripe checkout session");
        }

        return session.url;
    },
});

export const fulfillFunding = internalMutation({
    args: {
        businessId: v.id("businesses"),
        cadAmountPaid: v.number(),
    },
    handler: async (ctx, args) => {
        const business = await ctx.db.get(args.businessId);
        if (!business) throw new Error("Business not found");

        const goldPrice = await ctx.db.query("goldPrice").order("desc").first();
        const pricePerOunce = goldPrice?.paxgCad ?? 2900; // Using a solid fallback

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
            note: `Funded $${args.cadAmountPaid.toFixed(2)} CAD via Stripe (${ouncesAdded} oz)`,
            createdAt: Date.now(),
        });
    },
});

export const stripeWebhook = httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature") as string;

    // In production, you would set a STRIPE_WEBHOOK_SECRET in your Convex dashboard
    // and strictly verify using stripe.webhooks.constructEvent. For this scope we will
    // parse the session but you absolute must add the secret verification before launch
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    const payload = await request.text();

    try {
        let event: Stripe.Event;

        if (webhookSecret) {
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
                apiVersion: "2024-12-18.acacia" as any,
            });
            event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        } else {
            // Unverified parsing (dev only, ensure you add secret later)
            event = JSON.parse(payload) as Stripe.Event;
        }

        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;

            if (session.metadata?.type === "fund_gold_pool") {
                const businessId = session.metadata.businessId as any;
                const amountPaidCad = (session.amount_total || 0) / 100;

                await ctx.runMutation(internal.stripe.fulfillFunding, {
                    businessId,
                    cadAmountPaid: amountPaidCad,
                });
            }
        }

        return new Response("Webhook processed", { status: 200 });
    } catch (err: any) {
        console.error("Stripe webhook error:", err.message);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
});
