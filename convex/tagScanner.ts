import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

/* eslint-disable no-var */
declare var process: { env: Record<string, string | undefined> };
declare var Buffer: { from(data: ArrayBuffer): { toString(encoding: string): string } };

// ─── Instagram Tag Scanner ───
// On-demand: triggered when a user claims they tagged a business
// 1. Playwright browses instagram.com/{business}/tagged/
// 2. Screenshots the tagged grid + recent individual posts
// 3. Gemini Flash checks if the claiming user's handle appears
// 4. Auto-verifies if found, rejects if not

const PLAYWRIGHT_URL = process.env.PLAYWRIGHT_SERVICE_URL ?? "http://localhost:3333";

// ── Internal queries ──

export const getBusinessById = internalQuery({
    args: { businessId: v.id("businesses") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.businessId);
    },
});

export const getCampaignById = internalQuery({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.campaignId);
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

// ── Gemini AI helper (supports Google AI Studio + OpenRouter) ──

async function analyzeWithGemini(prompt: string, screenshotBase64: string): Promise<string> {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (geminiKey) {
        // Google AI Studio (free)
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: "image/png", data: screenshotBase64 } },
                        ],
                    }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
                }),
            }
        );
        if (!resp.ok) throw new Error(`Gemini API ${resp.status}`);
        const data = await resp.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    }

    if (openrouterKey) {
        // OpenRouter fallback
        const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openrouterKey}`,
                "HTTP-Referer": "https://localkarat.ca",
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [{
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: `data:image/png;base64,${screenshotBase64}` } },
                    ],
                }],
                max_tokens: 500,
                temperature: 0.1,
            }),
        });
        if (!resp.ok) throw new Error(`OpenRouter ${resp.status}`);
        const data = await resp.json();
        return (data as any).choices?.[0]?.message?.content ?? "";
    }

    throw new Error("No AI API key set (GEMINI_API_KEY or OPENROUTER_API_KEY)");
}

// ── Main scan action (called when user claims a tag) ──

export const scanForUser = action({
    args: {
        campaignId: v.id("campaigns"),
        customerId: v.id("users"),
        instagramHandle: v.string(),
    },
    handler: async (ctx, args): Promise<{ verified: boolean; reason: string }> => {
        const handle = args.instagramHandle.toLowerCase().replace(/^@/, "");

        // Step 1: Get campaign and business
        const campaign = await ctx.runQuery(internal.tagScanner.getCampaignById, {
            campaignId: args.campaignId,
        });

        if (!campaign) return { verified: false, reason: "Campaign not found" };
        if (campaign.status !== "active") return { verified: false, reason: "Campaign is not active" };
        if (campaign.currentSubmissions >= campaign.maxSubmissions) return { verified: false, reason: "Campaign is full" };

        const business = await ctx.runQuery(internal.tagScanner.getBusinessById, {
            businessId: campaign.businessId,
        });
        if (!business) return { verified: false, reason: "Business not found" };

        const businessIgHandle = business.instagramHandle?.replace(/^@/, "").toLowerCase();
        if (!businessIgHandle) {
            return { verified: false, reason: "Business has no Instagram handle configured" };
        }

        // Step 2: Check cooldown
        const alreadySubmitted = await ctx.runQuery(internal.tagScanner.hasRecentSubmission, {
            customerId: args.customerId,
            campaignId: args.campaignId,
        });
        if (alreadySubmitted) {
            return { verified: false, reason: "Cooldown active: You can only submit once every 7 days." };
        }

        // Step 3: Call Playwright to scan Instagram tagged posts
        let scanResult: any;
        try {
            const response = await fetch(`${PLAYWRIGHT_URL}/scan-tagged`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessHandle: businessIgHandle,
                    lookForUser: handle,
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));

                if ((errData as any).needsAuth) {
                    // Instagram session expired — fall back to auto-approve
                    console.warn("[scan] Instagram auth expired — auto-approving");
                    await ctx.runMutation(internal.tagScanner.autoVerifySubmission, {
                        campaignId: args.campaignId,
                        customerId: args.customerId,
                        businessId: business._id,
                        instagramHandle: handle,
                        rewardGrams: campaign.rewardGrams,
                    });
                    return { verified: true, reason: "Auto-approved (Instagram session expired — please update cookies)" };
                }

                throw new Error(`Playwright service error: ${response.status}`);
            }

            scanResult = await response.json();
        } catch (err: any) {
            console.error("[scan] Playwright unavailable:", err.message);
            // Playwright down — fall back to auto-approve with note
            await ctx.runMutation(internal.tagScanner.autoVerifySubmission, {
                campaignId: args.campaignId,
                customerId: args.customerId,
                businessId: business._id,
                instagramHandle: handle,
                rewardGrams: campaign.rewardGrams,
            });
            return { verified: true, reason: "Auto-approved (scanner offline)" };
        }

        // Step 4: Quick check — did Playwright already find the handle in text?
        const textHandles: string[] = (scanResult.foundHandles ?? []).map((h: string) => h.toLowerCase());
        if (textHandles.includes(handle)) {
            console.log(`[scan] Quick match: @${handle} found in extracted text`);
            await ctx.runMutation(internal.tagScanner.autoVerifySubmission, {
                campaignId: args.campaignId,
                customerId: args.customerId,
                businessId: business._id,
                instagramHandle: handle,
                rewardGrams: campaign.rewardGrams,
            });
            return { verified: true, reason: `@${handle} found in ${business.name}'s tagged posts` };
        }

        // Step 5: Send screenshots to Gemini for deeper analysis
        const hasAiKey = process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY;
        if (!hasAiKey) {
            // No AI key — auto-approve since Playwright at least confirmed the page loaded
            await ctx.runMutation(internal.tagScanner.autoVerifySubmission, {
                campaignId: args.campaignId,
                customerId: args.customerId,
                businessId: business._id,
                instagramHandle: handle,
                rewardGrams: campaign.rewardGrams,
            });
            return { verified: true, reason: "Auto-approved (AI verification not configured)" };
        }

        // Analyze each screenshot with Gemini
        const screenshots: string[] = scanResult.screenshots ?? [];
        if (screenshots.length === 0) {
            await ctx.runMutation(internal.tagScanner.createRejectedSubmission, {
                campaignId: args.campaignId,
                customerId: args.customerId,
                businessId: business._id,
                instagramHandle: handle,
                reason: "Could not load tagged posts — the business may have no tagged posts",
                rewardGrams: campaign.rewardGrams,
            });
            return { verified: false, reason: "No tagged posts found for this business" };
        }

        // Send the grid screenshot + first post screenshot to Gemini
        const screenshotToAnalyze = screenshots[0]; // Grid view
        const prompt = `You are verifying whether Instagram user "@${handle}" has tagged the business "@${businessIgHandle}" (${business.name}).

You are looking at a screenshot of @${businessIgHandle}'s Instagram "Tagged" tab — this shows posts where other users have tagged this business.

Your task: determine if "@${handle}" appears as the author/poster of ANY visible post in this grid.

Look for:
- Usernames visible on posts, profile pictures, or captions
- The username "@${handle}" or "${handle}" anywhere in the visible content
- Any text that matches or closely resembles this username

Return ONLY a JSON object (no markdown, no code fences):
{
  "found": true/false,
  "allVisibleUsernames": ["username1", "username2"],
  "confidence": 0-100,
  "reason": "brief explanation"
}

Rules:
- "found": true ONLY if you can see @${handle} as a post author
- "allVisibleUsernames": list ALL usernames you can see (without @)
- "confidence": how sure you are (90+ = definitely found, 30-60 = uncertain, <30 = not found)
- If the page hasn't loaded or shows no posts: {"found": false, "allVisibleUsernames": [], "confidence": 50, "reason": "Page did not load properly"}`;

        try {
            const raw = await analyzeWithGemini(prompt, screenshotToAnalyze);
            const jsonMatch = raw.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const found = parsed.found === true;
                const reason = parsed.reason ?? (found ? "Found in tagged posts" : "Not found in tagged posts");
                const confidence = parsed.confidence ?? 50;

                // If not found in grid, also check individual post screenshots
                if (!found && screenshots.length > 1) {
                    for (let i = 1; i < Math.min(screenshots.length, 4); i++) {
                        try {
                            const postPrompt = `Look at this Instagram post screenshot. Is the poster's username "@${handle}" or "${handle}"? Just respond with JSON: {"found": true/false, "username": "visible_username", "confidence": 0-100}`;
                            const postRaw = await analyzeWithGemini(postPrompt, screenshots[i]);
                            const postMatch = postRaw.match(/\{[\s\S]*\}/);
                            if (postMatch) {
                                const postParsed = JSON.parse(postMatch[0]);
                                if (postParsed.found === true && postParsed.confidence > 70) {
                                    await ctx.runMutation(internal.tagScanner.autoVerifySubmission, {
                                        campaignId: args.campaignId,
                                        customerId: args.customerId,
                                        businessId: business._id,
                                        instagramHandle: handle,
                                        rewardGrams: campaign.rewardGrams,
                                    });
                                    return { verified: true, reason: `@${handle} found in tagged post #${i}` };
                                }
                            }
                        } catch {
                            // Continue checking other posts
                        }
                    }
                }

                if (found && confidence > 60) {
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
            console.error("[scan] AI analysis error:", err.message);
        }

        // AI failed — reject with helpful message
        await ctx.runMutation(internal.tagScanner.createRejectedSubmission, {
            campaignId: args.campaignId,
            customerId: args.customerId,
            businessId: business._id,
            instagramHandle: handle,
            reason: "Verification could not be completed — please try again or upload a screenshot",
            rewardGrams: campaign.rewardGrams,
        });
        return { verified: false, reason: "Verification could not be completed — please try again" };
    },
});
