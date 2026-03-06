import { v } from "convex/values";
import { query, action } from "./_generated/server";

// Simple password check against env var
export const verifyPassword = action({
    args: { password: v.string() },
    handler: async (_ctx, args) => {
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword) throw new Error("Admin password not configured");
        return args.password === adminPassword;
    },
});

// Aggregated platform-wide statistics
export const getDashboardStats = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const businesses = await ctx.db.query("businesses").collect();
        const campaigns = await ctx.db.query("campaigns").collect();
        const withdrawals = await ctx.db.query("withdrawals").collect();
        const treasury = await ctx.db
            .query("karatTreasury")
            .withIndex("by_asset", (q) => q.eq("assetType", "cad"))
            .first();
        const goldPrice = await ctx.db.query("goldPrice").order("desc").first();

        const customers = users.filter((u) => u.role === "customer");
        const totalGoldInCirculation = customers.reduce((sum, u) => sum + u.goldBalance, 0);
        const totalEarnedEver = customers.reduce((sum, u) => sum + u.totalEarned, 0);
        const totalCashedOutEver = customers.reduce((sum, u) => sum + u.totalCashedOut, 0);

        const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
        const totalSubmissions = campaigns.reduce((sum, c) => sum + c.currentSubmissions, 0);

        const totalBusinessFunded = businesses.reduce((sum, b) => sum + b.totalGoldFunded, 0);
        const totalGoldPools = businesses.reduce((sum, b) => sum + b.goldPool, 0);

        const completedWithdrawals = withdrawals.filter((w) => w.status === "completed");
        const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending" || w.status === "processing");
        const totalPaidOut = completedWithdrawals.reduce((sum, w) => sum + w.cadAmount, 0);

        const stripeConnectedUsers = customers.filter((u) => u.stripeConnectOnboarded).length;

        return {
            // Users
            totalUsers: users.length,
            totalCustomers: customers.length,
            totalBusinessOwners: users.filter((u) => u.role === "business").length,
            stripeConnectedUsers,

            // Gold
            totalGoldInCirculation,
            totalEarnedEver,
            totalCashedOutEver,
            goldPricePerOunce: goldPrice?.paxgCad ?? 2900,

            // Businesses
            totalBusinesses: businesses.length,
            totalBusinessFunded,
            totalGoldPools,

            // Campaigns
            totalCampaigns: campaigns.length,
            activeCampaigns,
            totalSubmissions,

            // Withdrawals
            totalWithdrawals: withdrawals.length,
            pendingWithdrawals: pendingWithdrawals.length,
            completedWithdrawals: completedWithdrawals.length,
            totalPaidOut,

            // Treasury
            treasuryBalance: treasury?.balance ?? 0,
            treasuryTotalCollected: treasury?.totalCollected ?? 0,
        };
    },
});

// All users with computed fields
export const getAllUsers = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").order("desc").take(200);
        return users.map((u) => ({
            _id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            goldBalance: u.goldBalance,
            totalEarned: u.totalEarned,
            totalCashedOut: u.totalCashedOut,
            stripeConnected: u.stripeConnectOnboarded ?? false,
            createdAt: u.createdAt,
        }));
    },
});

// All businesses with stats
export const getAllBusinesses = query({
    args: {},
    handler: async (ctx) => {
        const businesses = await ctx.db.query("businesses").order("desc").take(100);

        return await Promise.all(
            businesses.map(async (b) => {
                const owner = await ctx.db.get(b.ownerId);
                const campaigns = await ctx.db
                    .query("campaigns")
                    .withIndex("by_business", (q) => q.eq("businessId", b._id))
                    .collect();

                return {
                    _id: b._id,
                    name: b.name,
                    category: b.category,
                    location: b.location,
                    ownerName: owner?.name ?? "Unknown",
                    ownerEmail: owner?.email ?? "",
                    goldPool: b.goldPool,
                    totalGoldFunded: b.totalGoldFunded,
                    cadBalance: b.cadBalance ?? 0,
                    campaignCount: campaigns.length,
                    activeCampaigns: campaigns.filter((c) => c.status === "active").length,
                    createdAt: b.createdAt,
                };
            })
        );
    },
});

// All campaigns with business names
export const getAllCampaigns = query({
    args: {},
    handler: async (ctx) => {
        const campaigns = await ctx.db.query("campaigns").order("desc").take(200);

        return await Promise.all(
            campaigns.map(async (c) => {
                const business = await ctx.db.get(c.businessId);
                return {
                    _id: c._id,
                    title: c.title,
                    businessName: business?.name ?? "Unknown",
                    status: c.status,
                    rewardGrams: c.rewardGrams,
                    maxSubmissions: c.maxSubmissions,
                    currentSubmissions: c.currentSubmissions,
                    verificationMethod: c.verificationMethod ?? "manual",
                    platformFee: c.platformFee ?? 0,
                    platformFeeCad: c.platformFeeCad ?? 0,
                    createdAt: c.createdAt,
                };
            })
        );
    },
});

// All withdrawals with user info
export const getAllWithdrawals = query({
    args: {},
    handler: async (ctx) => {
        const withdrawals = await ctx.db.query("withdrawals").order("desc").take(200);

        return await Promise.all(
            withdrawals.map(async (w) => {
                const user = await ctx.db.get(w.userId);
                return {
                    _id: w._id,
                    userName: user?.name ?? "Unknown",
                    userEmail: user?.email ?? "",
                    amount: w.amount,
                    cadAmount: w.cadAmount,
                    method: w.method,
                    status: w.status,
                    stripeTransferId: w.stripeTransferId,
                    cryptoTxSignature: w.cryptoTxSignature,
                    cryptoDestAddress: w.cryptoDestAddress,
                    failureReason: w.failureReason,
                    completedAt: w.completedAt,
                    createdAt: w.createdAt,
                };
            })
        );
    },
});
