import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { api } from "./_generated/api";

// Generate a file upload URL for screenshot submissions
export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

// Submit a post for verification (branches on campaign verification method)
export const submit = mutation({
    args: {
        campaignId: v.id("campaigns"),
        customerId: v.id("users"),
        postUrl: v.optional(v.string()),
        imageStorageId: v.optional(v.id("_storage")),
        submissionMethod: v.union(v.literal("upload"), v.literal("url")),
        platform: v.string(),
    },
    handler: async (ctx, args) => {
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");
        if (campaign.status !== "active") throw new Error("Campaign is not active");
        if (campaign.currentSubmissions >= campaign.maxSubmissions) {
            throw new Error("Campaign is full");
        }

        // Check 1-week per-campaign cooldown
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentSubs = await ctx.db
            .query("submissions")
            .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
            .collect();

        const hasCooldown = recentSubs.some(s => s.campaignId === args.campaignId && s.createdAt > oneWeekAgo);
        if (hasCooldown) {
            throw new Error("Cooldown active: You can only submit to a campaign once every 7 days.");
        }

        const method = campaign.verificationMethod ?? "manual";

        if (method === "manual") {
            // Manual verification: create pending submission, business reviews
            if (!args.postUrl) throw new Error("Post URL is required for manual verification");

            const submissionId = await ctx.db.insert("submissions", {
                campaignId: args.campaignId,
                customerId: args.customerId,
                businessId: campaign.businessId,
                postUrl: args.postUrl,
                imageStorageId: args.imageStorageId,
                submissionMethod: args.submissionMethod,
                platform: args.platform,
                status: "pending",
                verificationMethod: "manual",
                rewardGrams: campaign.rewardGrams,
                createdAt: Date.now(),
            });

            return submissionId;
        } else {
            // Auto verification: use old AI flow as fallback when tagScanner isn't available
            const submissionId = await ctx.db.insert("submissions", {
                campaignId: args.campaignId,
                customerId: args.customerId,
                businessId: campaign.businessId,
                postUrl: args.postUrl,
                imageStorageId: args.imageStorageId,
                submissionMethod: args.submissionMethod,
                platform: args.platform,
                status: "verifying",
                verificationMethod: "auto",
                rewardGrams: campaign.rewardGrams,
                createdAt: Date.now(),
            });

            // Schedule AI verification
            await ctx.scheduler.runAfter(0, api.ai.verifySubmission, {
                submissionId,
            });

            return submissionId;
        }
    },
});

// Business approves a pending submission
export const approveSubmission = mutation({
    args: {
        submissionId: v.id("submissions"),
    },
    handler: async (ctx, args) => {
        const sub = await ctx.db.get(args.submissionId);
        if (!sub) throw new Error("Submission not found");
        if (sub.status !== "pending") throw new Error("Submission is not pending");

        // Mark as verified
        await ctx.db.patch(args.submissionId, {
            status: "verified",
            verifiedAt: Date.now(),
            aiReason: "Manually approved by business",
            confidenceScore: 100,
        });

        // Credit gold to customer
        const customer = await ctx.db.get(sub.customerId);
        if (customer) {
            await ctx.db.patch(sub.customerId, {
                goldBalance: customer.goldBalance + sub.rewardGrams,
                totalEarned: customer.totalEarned + sub.rewardGrams,
            });
        }

        // Record earn transaction
        await ctx.db.insert("goldTransactions", {
            userId: sub.customerId,
            type: "earn",
            amount: sub.rewardGrams,
            submissionId: args.submissionId,
            businessId: sub.businessId,
            note: "Manually approved by business",
            createdAt: Date.now(),
        });

        // Increment campaign submissions
        const campaign = await ctx.db.get(sub.campaignId);
        if (campaign) {
            await ctx.db.patch(sub.campaignId, {
                currentSubmissions: campaign.currentSubmissions + 1,
            });
            if (campaign.currentSubmissions + 1 >= campaign.maxSubmissions) {
                await ctx.db.patch(sub.campaignId, { status: "completed" });
            }
        }
    },
});

// Business rejects a pending submission
export const rejectSubmission = mutation({
    args: {
        submissionId: v.id("submissions"),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const sub = await ctx.db.get(args.submissionId);
        if (!sub) throw new Error("Submission not found");
        if (sub.status !== "pending") throw new Error("Submission is not pending");

        await ctx.db.patch(args.submissionId, {
            status: "rejected",
            aiReason: args.reason ?? "Rejected by business",
            confidenceScore: 0,
        });
    },
});

// List pending submissions for business approval queue
export const listPendingByBusiness = query({
    args: { businessId: v.id("businesses") },
    handler: async (ctx, args) => {
        const submissions = await ctx.db
            .query("submissions")
            .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
            .order("desc")
            .collect();

        const pending = submissions.filter((s) => s.status === "pending");

        return await Promise.all(
            pending.map(async (sub) => {
                const customer = await ctx.db.get(sub.customerId);
                const campaign = await ctx.db.get(sub.campaignId);
                return {
                    ...sub,
                    customerName: customer?.name ?? "Unknown",
                    customerInstagram: customer?.instagramHandle ?? "",
                    campaignTitle: campaign?.title ?? "Unknown Campaign",
                    hoursUntilAutoApprove: Math.max(
                        0,
                        24 - (Date.now() - sub.createdAt) / (1000 * 60 * 60)
                    ),
                };
            })
        );
    },
});

// List submissions by customer (for rewards activity feed)
export const listByCustomer = query({
    args: { customerId: v.id("users") },
    handler: async (ctx, args) => {
        const submissions = await ctx.db
            .query("submissions")
            .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
            .order("desc")
            .collect();

        return await Promise.all(
            submissions.map(async (sub) => {
                const business = await ctx.db.get(sub.businessId);
                return {
                    ...sub,
                    businessName: business?.name ?? "Unknown",
                };
            })
        );
    },
});

// List submissions by business (for dashboard)
export const listByBusiness = query({
    args: { businessId: v.id("businesses") },
    handler: async (ctx, args) => {
        const submissions = await ctx.db
            .query("submissions")
            .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
            .order("desc")
            .collect();

        return await Promise.all(
            submissions.map(async (sub) => {
                const customer = await ctx.db.get(sub.customerId);
                return {
                    ...sub,
                    customerName: customer?.name ?? "Unknown",
                };
            })
        );
    },
});

// Get dashboard stats for a business
export const getStats = query({
    args: { businessId: v.id("businesses") },
    handler: async (ctx, args) => {
        const submissions = await ctx.db
            .query("submissions")
            .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
            .collect();

        const verified = submissions.filter((s) => s.status === "verified");
        const pending = submissions.filter((s) => s.status === "pending" || s.status === "verifying");

        const business = await ctx.db.get(args.businessId);

        // Get unique customer IDs
        const uniqueCustomers = new Set(verified.map((s) => s.customerId));

        const totalGoldPaid = verified.reduce((sum, s) => sum + s.rewardGrams, 0);

        // Aggregate reach metrics
        const totalReach = verified.reduce((sum, s) => sum + (s.followerCount ?? 0), 0);
        const averageFollowers = verified.length > 0 ? Math.round(totalReach / verified.length) : 0;

        return {
            goldRemaining: business?.goldPool ?? 0,
            postsVerified: verified.length,
            postsPending: pending.length,
            totalSubmissions: submissions.length,
            totalGoldPaid,
            uniquePatrons: uniqueCustomers.size,
            totalReach,
            averageFollowers,
        };
    },
});

// Auto-approve submissions older than 24 hours (called by cron)
export const autoApproveStalePending = internalMutation({
    args: {},
    handler: async (ctx) => {
        const allSubmissions = await ctx.db
            .query("submissions")
            .withIndex("by_status", (q) => q.eq("status", "pending"))
            .collect();

        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        const stale = allSubmissions.filter((s) => s.createdAt < twentyFourHoursAgo);

        let approved = 0;

        for (const sub of stale) {
            // Mark as verified
            await ctx.db.patch(sub._id, {
                status: "verified",
                verifiedAt: Date.now(),
                aiReason: "Auto-approved after 24 hours (no business response)",
                confidenceScore: 100,
            });

            // Credit gold
            const customer = await ctx.db.get(sub.customerId);
            if (customer) {
                await ctx.db.patch(sub.customerId, {
                    goldBalance: customer.goldBalance + sub.rewardGrams,
                    totalEarned: customer.totalEarned + sub.rewardGrams,
                });
            }

            // Record transaction
            await ctx.db.insert("goldTransactions", {
                userId: sub.customerId,
                type: "earn",
                amount: sub.rewardGrams,
                submissionId: sub._id,
                businessId: sub.businessId,
                note: "Auto-approved after 24h — no business response",
                createdAt: Date.now(),
            });

            // Increment campaign
            const campaign = await ctx.db.get(sub.campaignId);
            if (campaign) {
                await ctx.db.patch(sub.campaignId, {
                    currentSubmissions: campaign.currentSubmissions + 1,
                });
                if (campaign.currentSubmissions + 1 >= campaign.maxSubmissions) {
                    await ctx.db.patch(sub.campaignId, { status: "completed" });
                }
            }

            approved++;
        }

        if (approved > 0) {
            console.log(`[autoApprove] Auto-approved ${approved} stale pending submissions`);
        }

        return { approved };
    },
});

// Get active 7-day cooldowns for a customer
export const getActiveCooldowns = query({
    args: { customerId: v.optional(v.id("users")) },
    handler: async (ctx, args) => {
        if (!args.customerId) return {};

        const customerId = args.customerId;
        const submissions = await ctx.db
            .query("submissions")
            .withIndex("by_customer", (q) => q.eq("customerId", customerId))
            .collect();

        const cooldowns: Record<string, number> = {};
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        for (const sub of submissions) {
            const timeSince = now - sub.createdAt;
            if (timeSince < oneWeekMs) {
                const endsAt = sub.createdAt + oneWeekMs;
                const existing = cooldowns[sub.campaignId];
                if (!existing || endsAt > existing) {
                    cooldowns[sub.campaignId] = endsAt;
                }
            }
        }

        return cooldowns;
    },
});
