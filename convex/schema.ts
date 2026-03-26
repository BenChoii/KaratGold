import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // Internal: custodial wallet keys (never exposed to frontend)
    walletKeys: defineTable({
        userId: v.id("users"),
        publicKey: v.string(),
        encryptedPrivateKey: v.string(), // base64-encoded
        createdAt: v.float64(),
    }).index("by_user", ["userId"]),

    users: defineTable({
        clerkId: v.string(),
        name: v.string(),
        email: v.string(),
        role: v.union(v.literal("customer"), v.literal("business"), v.literal("pending")),
        avatarUrl: v.optional(v.string()),
        instagramHandle: v.optional(v.string()),
        location: v.optional(v.string()),
        goldBalance: v.float64(),
        totalEarned: v.float64(),
        totalCashedOut: v.float64(),
        walletAddress: v.optional(v.string()), // For external UI display/connection
        custodialWalletAddress: v.optional(v.string()), // Backend-managed Solana address
        encryptedPrivateKey: v.optional(v.string()), // Backend-managed key
        // Stripe Connect (deprecated — now using Solana/PAXG)
        stripeConnectAccountId: v.optional(v.string()),
        stripeConnectOnboarded: v.optional(v.boolean()),
        stripePayoutMethod: v.optional(v.union(v.literal("bank"), v.literal("debit"))),
        createdAt: v.float64(),
    })
        .index("by_clerk_id", ["clerkId"])
        .index("by_role", ["role"]),

    withdrawals: defineTable({
        userId: v.id("users"),
        amount: v.float64(),           // gold ounces
        cadAmount: v.float64(),        // CAD equivalent at time of withdrawal
        method: v.union(v.literal("stripe"), v.literal("crypto")),
        status: v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("failed")
        ),
        stripeTransferId: v.optional(v.string()),
        cryptoTxSignature: v.optional(v.string()),
        cryptoDestAddress: v.optional(v.string()),
        failureReason: v.optional(v.string()),
        completedAt: v.optional(v.float64()),
        createdAt: v.float64(),
    })
        .index("by_user", ["userId"])
        .index("by_status", ["status"])
        .index("by_method", ["method"]),

    businesses: defineTable({
        ownerId: v.id("users"),
        name: v.string(),
        category: v.string(),
        location: v.string(),
        latitude: v.optional(v.float64()),
        longitude: v.optional(v.float64()),
        locationType: v.optional(v.union(v.literal("physical"), v.literal("service_area"))),
        serviceAreas: v.optional(v.array(v.string())),
        instagramHandle: v.optional(v.string()),
        facebookHandle: v.optional(v.string()),
        goldPool: v.float64(),
        totalGoldFunded: v.float64(),
        preferredCurrency: v.optional(v.union(v.literal("gold"), v.literal("cad"))),
        cadBalance: v.optional(v.float64()),
        walletAddress: v.optional(v.string()), // For external UI display/connection
        custodialWalletAddress: v.optional(v.string()), // Backend-managed Solana address
        encryptedPrivateKey: v.optional(v.string()), // Backend-managed key
        // EmbedSocial tagged-post widget
        embedSocialActive: v.optional(v.boolean()),
        embedSocialWidgetId: v.optional(v.string()),
        embedSocialActivatedAt: v.optional(v.float64()),
        // Verification tier
        verificationTier: v.optional(v.union(v.literal("manual"), v.literal("auto"))),
        proSubscriptionActive: v.optional(v.boolean()),
        proSubscriptionStartedAt: v.optional(v.float64()),
        // Revenue tracking
        totalPlatformFees: v.optional(v.float64()),
        createdAt: v.float64(),
    }).index("by_owner", ["ownerId"]),

    campaigns: defineTable({
        businessId: v.id("businesses"),
        title: v.string(),
        description: v.string(),
        rewardGrams: v.float64(),
        maxSubmissions: v.number(),
        currentSubmissions: v.number(),
        platforms: v.array(v.string()),
        requirements: v.array(v.string()),
        status: v.union(
            v.literal("active"),
            v.literal("paused"),
            v.literal("completed")
        ),
        currencyMode: v.optional(v.union(v.literal("gold"), v.literal("cad"))),
        cadBudget: v.optional(v.float64()),
        cadRewardPerPost: v.optional(v.float64()),
        goldPriceAtCreation: v.optional(v.float64()),
        escrowAddress: v.optional(v.string()),
        escrowFunded: v.optional(v.float64()),
        onChainTxSignature: v.optional(v.string()),
        // Platform fee
        platformFee: v.optional(v.float64()),
        platformFeeCad: v.optional(v.float64()),
        // Verification method (inherits from business tier at creation)
        verificationMethod: v.optional(v.union(v.literal("manual"), v.literal("auto"))),
        createdAt: v.float64(),
    })
        .index("by_business", ["businessId"])
        .index("by_status", ["status"]),

    submissions: defineTable({
        campaignId: v.id("campaigns"),
        customerId: v.id("users"),
        businessId: v.id("businesses"),
        postUrl: v.optional(v.string()),
        imageStorageId: v.optional(v.id("_storage")),
        submissionMethod: v.optional(v.union(v.literal("upload"), v.literal("url"))),
        platform: v.string(),
        status: v.union(
            v.literal("pending"),
            v.literal("verifying"),
            v.literal("verified"),
            v.literal("rejected")
        ),
        // Verification method used for this submission
        verificationMethod: v.optional(v.union(v.literal("manual"), v.literal("auto"))),
        confidenceScore: v.optional(v.float64()),
        aiReason: v.optional(v.string()),
        followerCount: v.optional(v.float64()),
        rewardGrams: v.float64(),
        verifiedAt: v.optional(v.float64()),
        createdAt: v.float64(),
    })
        .index("by_customer", ["customerId"])
        .index("by_business", ["businessId"])
        .index("by_campaign", ["campaignId"])
        .index("by_status", ["status"]),

    goldTransactions: defineTable({
        userId: v.id("users"),
        type: v.union(
            v.literal("earn"),
            v.literal("cashout"),
            v.literal("fund"),
            v.literal("platform_fee")
        ),
        amount: v.float64(),
        submissionId: v.optional(v.id("submissions")),
        businessId: v.optional(v.id("businesses")),
        note: v.optional(v.string()),
        txSignature: v.optional(v.string()),
        createdAt: v.float64(),
    })
        .index("by_user", ["userId"])
        .index("by_type", ["type"]),

    goldPrice: defineTable({
        pricePerGram: v.float64(),
        paxgCad: v.float64(),
        usdCadRate: v.float64(),
        currency: v.string(),
        source: v.string(),
        fetchedAt: v.float64(),
    }),

    // Global internal ledger for tracking KaratGold's 20% platform fees
    karatTreasury: defineTable({
        assetType: v.union(v.literal("paxg"), v.literal("sol"), v.literal("cad"), v.literal("usd")),
        balance: v.float64(),
        totalCollected: v.float64(),
        totalSwapped: v.float64(), // Amount of CAD/USD swapped to actual Crypto in the master wallet
        lastUpdated: v.float64(),
    }).index("by_asset", ["assetType"]),
});
