import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/* eslint-disable no-var */
declare var process: { env: Record<string, string | undefined> };
declare var Buffer: { from(data: ArrayBuffer): { toString(encoding: string): string } };

// ─── OpenRouter (Gemini 2.0 Flash) verification action ───
// Analyzes an uploaded screenshot against campaign requirements
// Extracts: approval status, confidence, reason, followerCount, location/business tagging
export const verifySubmission = action({
    args: {
        submissionId: v.id("submissions"),
    },
    handler: async (ctx, args): Promise<void> => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            console.error("OPENROUTER_API_KEY not set — falling back to auto-approve");
            await ctx.runMutation(internal.ai.applyVerdict, {
                submissionId: args.submissionId,
                approved: true,
                confidence: 75,
                reason: "AI verification unavailable — auto-approved for demo",
                followerCount: 0,
            });
            return;
        }

        // 1. Fetch submission + campaign details
        const submission: any = await ctx.runQuery(internal.ai.getSubmissionContext, {
            submissionId: args.submissionId,
        });

        if (!submission) {
            console.error("Submission not found:", args.submissionId);
            return;
        }

        // 2. Get image data
        let imageBase64: string | null = null;

        if (submission.imageStorageId) {
            // Option A: uploaded screenshot
            const imageUrl = await ctx.storage.getUrl(submission.imageStorageId as Id<"_storage">);
            if (imageUrl) {
                const resp = await fetch(imageUrl);
                const buffer = await resp.arrayBuffer();
                imageBase64 = Buffer.from(buffer).toString("base64");
            }
        } else if (submission.postUrl) {
            // Option B: URL — try to fetch og:image
            try {
                const resp = await fetch(submission.postUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (compatible; KaratBot/1.0)",
                    },
                });
                const html = await resp.text();

                // Extract og:image from HTML meta tags
                const ogMatch = html.match(
                    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
                );
                if (ogMatch && ogMatch[1]) {
                    const imgResp = await fetch(ogMatch[1]);
                    const imgBuffer = await imgResp.arrayBuffer();
                    imageBase64 = Buffer.from(imgBuffer).toString("base64");
                }
            } catch (err) {
                console.error("Failed to fetch URL image:", err);
            }
        }

        // 3. Build prompt for Gemini 2.0 Flash via OpenRouter
        const requirements = submission.requirements?.join(", ") ?? "Include #ad, tag the business, show the product";
        const businessName = submission.businessName ?? "the business";
        const campaignName = submission.campaignName ?? "the campaign";
        const instagramHandle = submission.instagramHandle ?? "";
        const facebookHandle = submission.facebookHandle ?? "";

        const messages: any[] = [
            {
                role: "system",
                content: `You are a social media post verification AI for Karat, a gold rewards platform. Users post about local businesses on Instagram or Facebook to earn real gold. You analyze screenshots of their posts to verify authenticity and extract metrics. Respond ONLY in valid JSON — no markdown, no code fences.`,
            },
            {
                role: "user",
                content: imageBase64
                    ? [
                        {
                            type: "text",
                            text: `Verify this social media post screenshot for the campaign "${campaignName}" by ${businessName}.
${instagramHandle ? `Instagram: @${instagramHandle}` : ""}
${facebookHandle ? `Facebook: @${facebookHandle}` : ""}

Requirements: ${requirements}

Analyze the image and determine:
1. Is this a real social media post screenshot (not fabricated)?
2. Does it tag or mention: ${businessName}?
3. Is a location tagged in the post?
4. Does it meet the requirements listed above?
5. What is the poster's follower/friend count visible in the screenshot? Look for numbers like "1,234 followers" or "12.4K followers" on the profile. If not visible, return 0.

Respond in JSON format ONLY — no code fences, no extra text:
{"approved": true/false, "confidence": 0-100, "reason": "one sentence explanation", "followerCount": number, "locationTagged": true/false, "businessTagged": true/false}`,
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`,
                            },
                        },
                    ]
                    : [
                        {
                            type: "text",
                            text: `A user submitted a post URL (${submission.postUrl}) for the campaign "${campaignName}" by ${businessName}, but we couldn't fetch the image. The requirements are: ${requirements}. Since we cannot verify the visual content, respond with: {"approved": false, "confidence": 20, "reason": "Unable to analyze post — image could not be loaded from the provided URL. Please try uploading a screenshot instead.", "followerCount": 0, "locationTagged": false, "businessTagged": false}`,
                        },
                    ],
            },
        ];

        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": "https://karat.gold",
                    "X-Title": "Karat Gold Verification",
                },
                body: JSON.stringify({
                    model: "google/gemini-2.0-flash-001",
                    messages,
                    max_tokens: 300,
                    temperature: 0.1,
                }),
            });

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content ?? "";

            // Parse JSON from response (handle potential markdown code blocks)
            const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const result = JSON.parse(jsonStr);

            await ctx.runMutation(internal.ai.applyVerdict, {
                submissionId: args.submissionId,
                approved: result.approved ?? false,
                confidence: result.confidence ?? 50,
                reason: result.reason ?? "No reason provided",
                followerCount: typeof result.followerCount === "number" ? result.followerCount : 0,
            });
        } catch (err) {
            console.error("OpenRouter verification error:", err);
            // Fail gracefully — reject with explanation
            await ctx.runMutation(internal.ai.applyVerdict, {
                submissionId: args.submissionId,
                approved: false,
                confidence: 0,
                reason: "AI verification encountered an error. Please try again.",
                followerCount: 0,
            });
        }
    },
});

// ─── Internal query: get submission + campaign context for AI ───
export const getSubmissionContext = internalQuery({
    args: { submissionId: v.id("submissions") },
    handler: async (ctx, args) => {
        const submission = await ctx.db.get(args.submissionId);
        if (!submission) return null;

        const campaign = await ctx.db.get(submission.campaignId);
        const business = await ctx.db.get(submission.businessId);

        return {
            ...submission,
            requirements: campaign?.requirements,
            campaignName: campaign?.title,
            businessName: business?.name,
            instagramHandle: business?.instagramHandle,
            facebookHandle: business?.facebookHandle,
        };
    },
});

// ─── Internal mutation: apply AI verdict to submission ───
export const applyVerdict = internalMutation({
    args: {
        submissionId: v.id("submissions"),
        approved: v.boolean(),
        confidence: v.float64(),
        reason: v.string(),
        followerCount: v.float64(),
    },
    handler: async (ctx, args) => {
        const submission = await ctx.db.get(args.submissionId);
        if (!submission) return;
        if (submission.status !== "pending" && submission.status !== "verifying") return;

        const campaign = await ctx.db.get(submission.campaignId);
        if (!campaign) return;

        const business = await ctx.db.get(submission.businessId);
        if (!business) return;

        if (args.approved) {
            await ctx.db.patch(args.submissionId, {
                status: "verified",
                confidenceScore: args.confidence,
                aiReason: args.reason,
                rewardGrams: campaign.rewardGrams,
                followerCount: args.followerCount,
                verifiedAt: Date.now(),
            });

            // Credit gold to customer
            const customer = await ctx.db.get(submission.customerId);
            if (customer) {
                await ctx.db.patch(submission.customerId, {
                    goldBalance: customer.goldBalance + campaign.rewardGrams,
                    totalEarned: customer.totalEarned + campaign.rewardGrams,
                });
            }

            // Deduct from business pool
            await ctx.db.patch(submission.businessId, {
                goldPool: business.goldPool - campaign.rewardGrams,
            });

            // Increment campaign counter
            await ctx.db.patch(submission.campaignId, {
                currentSubmissions: campaign.currentSubmissions + 1,
            });

            // Record gold transaction
            await ctx.db.insert("goldTransactions", {
                userId: submission.customerId,
                type: "earn",
                amount: campaign.rewardGrams,
                submissionId: args.submissionId,
                businessId: submission.businessId,
                note: `Earned ${campaign.rewardGrams}g from ${business.name}`,
                createdAt: Date.now(),
            });

            // Auto-complete campaign if full
            if (campaign.currentSubmissions + 1 >= campaign.maxSubmissions) {
                await ctx.db.patch(submission.campaignId, { status: "completed" });
            }
        } else {
            await ctx.db.patch(args.submissionId, {
                status: "rejected",
                confidenceScore: args.confidence,
                aiReason: args.reason,
                rewardGrams: 0,
                followerCount: args.followerCount,
                verifiedAt: Date.now(),
            });
        }
    },
});
