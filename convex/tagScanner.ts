import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
// import type { Id } from "./_generated/dataModel";

/* eslint-disable no-var */
declare var process: { env: Record<string, string | undefined> };

// ─── Tag Scanner ───
// On-demand: triggered when a user claims they tagged a business
// 1. Playwright screenshots the business's /scan page (EmbedSocial widget)
// 2. Gemini Flash extracts visible usernames
// 3. Checks if the claiming user's handle appears
// 4. Auto-verifies if found, rejects if not

const PLAYWRIGHT_URL = process.env.PLAYWRIGHT_SERVICE_URL ?? "http://localhost:3333";
const SCAN_PAGE_BASE = process.env.SCAN_PAGE_BASE_URL ?? "http://localhost:5173";

// ── Internal queries ──

export const getBusinessById = internalQuery({
    args: { businessId: v.id("businesses") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.businessId);
    },
});

export const getActiveCampaigns = internalQuery({
    args: { businessId: v.id("businesses") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("campaigns")
            .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
            .filter((q) => q.eq(q.field("status"), "active"))
            .collect();
    },
});

export const hasRecentSubmission = internalQuery({
    args: {
        customerId: v.id("users"),
        campaignId: v.id("campaigns"),
    },
    handler: async (ctx, args) => {
        const subs = await ctx.db
            .query("submissions")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return subs.some(
            (s) => s.customerId === args.customerId && s.createdAt > oneWeekAgo
        );
    },
});

// ── Mutations ──

export const autoVerifySubmission = internalMutation({
    args: {
        campaignId: v.id("campaigns"),
        customerId: v.id("users"),
        businessId: v.id("businesses"),
        instagramHandle: v.string(),
        rewardGrams: v.float64(),
    },
    handler: async (ctx, args) => {
        const subId = await ctx.db.insert("submissions", {
            campaignId: args.campaignId,
            customerId: args.customerId,
            businessId: args.businessId,
            platform: "Instagram",
            status: "verified",
            submissionMethod: "url",
            rewardGrams: args.rewardGrams,
            confidenceScore: 95,
            aiReason: `Auto-verified: @${args.instagramHandle} found in tagged posts`,
            verifiedAt: Date.now(),
            createdAt: Date.now(),
        });

        // Credit gold
        const user = await ctx.db.get(args.customerId);
        if (user) {
            await ctx.db.patch(args.customerId, {
                goldBalance: user.goldBalance + args.rewardGrams,
                totalEarned: user.totalEarned + args.rewardGrams,
            });
        }

        // Record transaction
        await ctx.db.insert("goldTransactions", {
            userId: args.customerId,
            type: "earn",
            amount: args.rewardGrams,
            submissionId: subId,
            businessId: args.businessId,
            note: `Auto-verified tag by @${args.instagramHandle}`,
            createdAt: Date.now(),
        });

        // Increment campaign
        const campaign = await ctx.db.get(args.campaignId);
        if (campaign) {
            await ctx.db.patch(args.campaignId, {
                currentSubmissions: campaign.currentSubmissions + 1,
            });
            if (campaign.currentSubmissions + 1 >= campaign.maxSubmissions) {
                await ctx.db.patch(args.campaignId, { status: "completed" });
            }
        }

        return subId;
    },
});

export const createRejectedSubmission = internalMutation({
    args: {
        campaignId: v.id("campaigns"),
        customerId: v.id("users"),
        businessId: v.id("businesses"),
        instagramHandle: v.string(),
        reason: v.string(),
        rewardGrams: v.float64(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("submissions", {
            campaignId: args.campaignId,
            customerId: args.customerId,
            businessId: args.businessId,
            platform: "Instagram",
            status: "rejected",
            submissionMethod: "url",
            rewardGrams: args.rewardGrams,
            confidenceScore: 0,
            aiReason: args.reason,
            createdAt: Date.now(),
        });
    },
});

// ── Deactivate stale businesses (daily cron) ──

export const deactivateStaleBusinesses = internalMutation({
    args: {},
    handler: async (ctx) => {
        const businesses = await ctx.db.query("businesses").collect();
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        let deactivated = 0;

        for (const biz of businesses) {
            if (!biz.embedSocialActive) continue;

            const campaigns = await ctx.db
                .query("campaigns")
                .withIndex("by_business", (q) => q.eq("businessId", biz._id))
                .collect();

            const hasRecentActivity = campaigns.some(
                (c) =>
                    c.status === "active" ||
                    (c.status === "completed" && c.createdAt > thirtyDaysAgo)
            );

            if (!hasRecentActivity) {
                await ctx.db.patch(biz._id, { embedSocialActive: false });
                deactivated++;
            }
        }

        return { deactivated };
    },
});

// ── On-demand scan action (called when user claims a tag) ──

export const scanForUser = action({
    args: {
        campaignId: v.id("campaigns"),
        customerId: v.id("users"),
        instagramHandle: v.string(),
    },
    handler: async (ctx, args): Promise<{ verified: boolean; reason: string }> => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        const handle = args.instagramHandle.toLowerCase().replace(/^@/, "");

        // const campaigns = await ctx.runQuery(internal.tagScanner.getActiveCampaigns, {
        //     businessId: "placeholder" as any, // We'll get this from the campaign
        // });

        // Actually, let's get the campaign directly
        // We need a query for this — let's use the campaign data we already have
        // The campaign has businessId, so we fetch the business from there

        // Step 1: Get business from campaign
        const campaign = await ctx.runQuery(internal.tagScanner.getCampaignById, {
            campaignId: args.campaignId,
        });

        if (!campaign) {
            return { verified: false, reason: "Campaign not found" };
        }

        if (campaign.status !== "active") {
            return { verified: false, reason: "Campaign is not active" };
        }

        if (campaign.currentSubmissions >= campaign.maxSubmissions) {
            return { verified: false, reason: "Campaign is full" };
        }

        const business = await ctx.runQuery(internal.tagScanner.getBusinessById, {
            businessId: campaign.businessId,
        });

        if (!business) {
            return { verified: false, reason: "Business not found" };
        }

        // Step 2: Check for duplicates
        const alreadySubmitted = await ctx.runQuery(
            internal.tagScanner.hasRecentSubmission,
            {
                customerId: args.customerId,
                campaignId: args.campaignId,
            }
        );

        if (alreadySubmitted) {
            return { verified: false, reason: "Cooldown active: You can only submit to a campaign once every 7 days." };
        }

        // Step 3: Check if business has EmbedSocial active
        if (!business.embedSocialActive || !business.embedSocialWidgetId) {
            // No EmbedSocial — fall back to trust model (auto-approve for now)
            if (!apiKey) {
                await ctx.runMutation(internal.tagScanner.autoVerifySubmission, {
                    campaignId: args.campaignId,
                    customerId: args.customerId,
                    businessId: business._id,
                    instagramHandle: handle,
                    rewardGrams: campaign.rewardGrams,
                });
                return { verified: true, reason: "Auto-approved (verification not configured)" };
            }
        }

        // Step 4: Screenshot the scan page via Playwright
        const scanUrl = `${SCAN_PAGE_BASE}/scan/${business._id}`;
        let screenshotBase64: string;

        try {
            const response = await fetch(`${PLAYWRIGHT_URL}/scan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: scanUrl, waitMs: 10000 }),
            });

            if (!response.ok) {
                // Playwright not available — fall back to trust model
                await ctx.runMutation(internal.tagScanner.autoVerifySubmission, {
                    campaignId: args.campaignId,
                    customerId: args.customerId,
                    businessId: business._id,
                    instagramHandle: handle,
                    rewardGrams: campaign.rewardGrams,
                });
                return { verified: true, reason: "Auto-approved (scanner unavailable)" };
            }

            const data = await response.json() as { screenshot: string };
            screenshotBase64 = data.screenshot;
        } catch {
            // Playwright down — fallback
            await ctx.runMutation(internal.tagScanner.autoVerifySubmission, {
                campaignId: args.campaignId,
                customerId: args.customerId,
                businessId: business._id,
                instagramHandle: handle,
                rewardGrams: campaign.rewardGrams,
            });
            return { verified: true, reason: "Auto-approved (scanner offline)" };
        }

        // Step 5: Send to Gemini — check if this user's handle appears
        if (!apiKey) {
            await ctx.runMutation(internal.tagScanner.autoVerifySubmission, {
                campaignId: args.campaignId,
                customerId: args.customerId,
                businessId: business._id,
                instagramHandle: handle,
                rewardGrams: campaign.rewardGrams,
            });
            return { verified: true, reason: "Auto-approved (AI unavailable)" };
        }

        const prompt = `You are verifying whether the Instagram user "@${handle}" has tagged the business "${business.name}" (@${business.instagramHandle ?? "unknown"}).

You are looking at a screenshot of the business's tagged posts widget.

Your task: check if "@${handle}" appears as the poster of ANY post in this widget.

Return ONLY a JSON object:
{
  "found": true,
  "allUsernames": ["username1", "username2"],
  "confidence": 90,
  "reason": "Found @${handle}'s post in the tagged feed"
}

Rules:
- "found": true if @${handle} posted any of the visible tagged posts
- "allUsernames": list ALL visible usernames (without @)
- "confidence": 0-100 how sure you are
- "reason": brief explanation
- If the widget hasn't loaded or shows no posts: {"found": false, "allUsernames": [], "confidence": 50, "reason": "Widget did not load"}`;

        try {
            const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://okanagangold.com",
                },
                body: JSON.stringify({
                    model: "google/gemini-2.0-flash-001",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: `data:image/png;base64,${screenshotBase64}`,
                                    },
                                },
                            ],
                        },
                    ],
                    max_tokens: 500,
                }),
            });

            if (!aiResponse.ok) {
                throw new Error(`OpenRouter ${aiResponse.status}`);
            }

            const aiData = await aiResponse.json() as any;
            const raw = aiData.choices?.[0]?.message?.content ?? "";
            const jsonMatch = raw.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const found = parsed.found === true;
                const reason = parsed.reason ?? (found ? "Found in tagged posts" : "Not found in tagged posts");

                if (found) {
                    await ctx.runMutation(internal.tagScanner.autoVerifySubmission, {
                        campaignId: args.campaignId,
                        customerId: args.customerId,
                        businessId: business._id,
                        instagramHandle: handle,
                        rewardGrams: campaign.rewardGrams,
                    });
                    return { verified: true, reason };
                } else {
                    await ctx.runMutation(internal.tagScanner.createRejectedSubmission, {
                        campaignId: args.campaignId,
                        customerId: args.customerId,
                        businessId: business._id,
                        instagramHandle: handle,
                        reason: `Tag not found: ${reason}`,
                        rewardGrams: campaign.rewardGrams,
                    });
                    return { verified: false, reason };
                }
            }
        } catch (err: any) {
            console.error("[scanForUser] AI error:", err.message);
        }

        // AI failed — fall back to pending for manual review
        await ctx.runMutation(internal.tagScanner.createRejectedSubmission, {
            campaignId: args.campaignId,
            customerId: args.customerId,
            businessId: business._id,
            instagramHandle: handle,
            reason: "Verification could not be completed — submitted for manual review",
            rewardGrams: campaign.rewardGrams,
        });
        return { verified: false, reason: "Verification could not be completed" };
    },
});

// Internal query to get campaign by ID
export const getCampaignById = internalQuery({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.campaignId);
    },
});
