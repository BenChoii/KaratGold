import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/* eslint-disable no-var */
declare var process: { env: Record<string, string | undefined> };
declare var Buffer: { from(data: ArrayBuffer): { toString(encoding: string): string } };

// ─── AI Verification Engine ───
// Uses OpenRouter free models for AI verification
// Default model: google/gemini-2.0-flash-exp:free (via OpenRouter)
// Analyzes uploaded screenshots against campaign requirements
// Extracts: approval status, confidence, reason, followerCount

const OPENROUTER_MODEL = "google/gemini-2.0-flash-exp:free";

async function callOpenRouter(apiKey: string, prompt: string, imageBase64: string | null): Promise<any> {
    const userContent: any[] = imageBase64
        ? [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ]
        : [{ type: "text", text: prompt }];

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://localkarat.ca",
            "X-Title": "Karat Gold Verification",
        },
        body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: [
                { role: "system", content: "You are a social media post verification AI. Respond ONLY in valid JSON — no markdown, no code fences." },
                { role: "user", content: userContent },
            ],
            max_tokens: 400,
            temperature: 0.1,
        }),
    });

    if (!resp.ok) throw new Error(`OpenRouter ${resp.status}`);
    const data = await resp.json();
    return data.choices?.[0]?.message?.content ?? "";
}

export const verifySubmission = action({
    args: {
        submissionId: v.id("submissions"),
    },
    handler: async (ctx, args): Promise<void> => {
        // Check for OpenRouter API key
        const openrouterKey = process.env.OPENROUTER_API_KEY;

        if (!openrouterKey) {
            console.error("No OPENROUTER_API_KEY set — auto-approving");
            await ctx.runMutation(internal.ai.applyVerdict, {
                submissionId: args.submissionId,
                approved: true,
                confidence: 75,
                reason: "AI verification unavailable — auto-approved (set OPENROUTER_API_KEY in Convex dashboard)",
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

        // 2. Get image data from Convex storage or URL
        let imageBase64: string | null = null;

        if (submission.imageStorageId) {
            const imageUrl = await ctx.storage.getUrl(submission.imageStorageId as Id<"_storage">);
            if (imageUrl) {
                const resp = await fetch(imageUrl);
                const buffer = await resp.arrayBuffer();
                imageBase64 = Buffer.from(buffer).toString("base64");
            }
        } else if (submission.postUrl) {
            try {
                const resp = await fetch(submission.postUrl, {
                    headers: { "User-Agent": "Mozilla/5.0 (compatible; KaratBot/1.0)" },
                });
                const html = await resp.text();
                const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
                if (ogMatch && ogMatch[1]) {
                    const imgResp = await fetch(ogMatch[1]);
                    const imgBuffer = await imgResp.arrayBuffer();
                    imageBase64 = Buffer.from(imgBuffer).toString("base64");
                }
            } catch (err) {
                console.error("Failed to fetch URL image:", err);
            }
        }

        // 3. Build verification prompt
        const requirements = submission.requirements?.join(", ") ?? "Include #ad, tag the business, show the product";
        const businessName = submission.businessName ?? "the business";
        const campaignName = submission.campaignName ?? "the campaign";

        const prompt = imageBase64
            ? `You are a social media post verification AI for Karat, a gold rewards platform.

Verify this social media post screenshot for the campaign "${campaignName}" by ${businessName}.

Requirements: ${requirements}

Analyze the image and determine:
1. Is this a real social media post screenshot (Instagram, Facebook, etc.) — not a fabricated image?
2. Does it tag or mention: ${businessName}?
3. Is a location tagged in the post?
4. Does it meet the requirements listed above?
5. What is the poster's follower count visible in the screenshot? If not visible, return 0.

Respond ONLY in valid JSON — no code fences, no extra text:
{"approved": true/false, "confidence": 0-100, "reason": "one sentence explanation", "followerCount": number, "locationTagged": true/false, "businessTagged": true/false}`
            : `A user submitted a post URL but no image could be loaded. Respond with: {"approved": false, "confidence": 20, "reason": "Unable to analyze — please upload a screenshot instead.", "followerCount": 0, "locationTagged": false, "businessTagged": false}`;

        try {
            let raw: string;

            console.log(`[AI] Using OpenRouter (${OPENROUTER_MODEL}) for verification`);
            raw = await callOpenRouter(openrouterKey, prompt, imageBase64);

            // Parse JSON from response (strip potential markdown fences)
            const jsonStr = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);

                await ctx.runMutation(internal.ai.applyVerdict, {
                    submissionId: args.submissionId,
                    approved: result.approved ?? false,
                    confidence: result.confidence ?? 50,
                    reason: result.reason ?? "No reason provided",
                    followerCount: typeof result.followerCount === "number" ? result.followerCount : 0,
                });
                return;
            }

            throw new Error("Could not parse JSON from AI response");
        } catch (err: any) {
            console.error("[AI] Verification error:", err.message);
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
