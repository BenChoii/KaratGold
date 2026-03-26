import { mutation } from "./_generated/server";

// Seed development data
export const run = mutation({
    handler: async (ctx) => {
        // Clear existing data
        const tables = ["users", "businesses", "campaigns", "submissions", "goldTransactions", "goldPrice"] as const;
        for (const table of tables) {
            const records = await ctx.db.query(table).collect();
            for (const record of records) {
                await ctx.db.delete(record._id);
            }
        }

        // Add back gold price so it doesn't break UI
        await ctx.db.insert("goldPrice", {
            pricePerGram: 93.47,
            paxgUsd: 2908,
            source: "seed",
            fetchedAt: Date.now(),
        });

        // Create demo customer
        const customerId = await ctx.db.insert("users", {
            walletAddress: "DemoCustomer11111111111111111111111111111111",
            name: "Alex Chen",
            email: "alex@example.com",
            role: "customer",
            goldBalance: 2.65,
            totalEarned: 5.03,
            totalCashedOut: 2.38,
            createdAt: Date.now(),
        });

        // Create demo business owner
        const ownerId = await ctx.db.insert("users", {
            walletAddress: "DemoBusiness11111111111111111111111111111111",
            name: "Sarah Mitchell",
            email: "sarah@bluemountaincoffee.com",
            role: "business",
            goldBalance: 0,
            totalEarned: 0,
            totalCashedOut: 0,
            createdAt: Date.now(),
        });

        // Create businesses
        const businesses = [
            { name: "Blue Mountain Coffee", category: "Café", location: "Vancouver, BC" },
            { name: "Precision Plumbing Co.", category: "Plumbing", location: "Surrey, BC" },
            { name: "Maple Auto Detail", category: "Automotive", location: "Burnaby, BC" },
            { name: "True North Barbershop", category: "Barber", location: "New Westminster, BC" },
            { name: "Pacific Comfort HVAC", category: "HVAC", location: "Coquitlam, BC" },
            { name: "Canuck Brewing Co.", category: "Restaurant & Bar", location: "Vancouver, BC" },
        ];

        const businessIds = [];
        for (const b of businesses) {
            const id = await ctx.db.insert("businesses", {
                ownerId,
                ...b,
                goldPool: 10.7,
                totalGoldFunded: 10.7,
                createdAt: Date.now(),
            });
            businessIds.push(id);
        }

        // Create campaigns
        const campaignData = [
            {
                businessIdx: 0,
                title: "Summer Promo Campaign",
                description: "Post a photo enjoying our signature latte. Tag us and share why you love it with your friends.",
                rewardGrams: 0.0015, // ~$11.00 CAD
                maxSubmissions: 100,
                platforms: ["Instagram"],
                verificationMethod: "auto",
            },
            {
                businessIdx: 1,
                title: "Review Our Service",
                description: "Had work done by us? Share a post about your experience and recommend us to your neighbours.",
                rewardGrams: 0.003, // ~$22.15 CAD
                maxSubmissions: 50,
                platforms: ["Instagram"],
                verificationMethod: "auto",
            },
            {
                businessIdx: 2,
                title: "Before & After Detail",
                description: "Show the before/after of your car detail. Include our signage and tell your friends.",
                rewardGrams: 0.004, // ~$29.50 CAD
                maxSubmissions: 30,
                platforms: ["Instagram"],
                verificationMethod: "auto",
            },
            {
                businessIdx: 3,
                title: "Fresh Cut Friday",
                description: "Post your fresh cut and tag us. Recommend us to your community.",
                rewardGrams: 0.002, // ~$14.75 CAD
                maxSubmissions: 50,
                platforms: ["Instagram"],
                verificationMethod: "auto",
            },
            {
                businessIdx: 4,
                title: "HVAC Experience Share",
                description: "Just had an install or service? Share your experience with your local friends and neighbours.",
                rewardGrams: 0.0035, // ~$25.80 CAD
                maxSubmissions: 75,
                platforms: ["Instagram", "Facebook"],
                verificationMethod: "manual", // Keep one manual for testing
            },
            {
                businessIdx: 5,
                title: "Brewery Night Out",
                description: "Share a moment at our brewery with your crew. Show our craft beer and the vibe.",
                rewardGrams: 0.0025, // ~$18.45 CAD
                maxSubmissions: 40,
                platforms: ["Instagram"],
                verificationMethod: "auto",
            },
        ];

        const campaignIds = [];
        for (const c of campaignData) {
            const id = await ctx.db.insert("campaigns", {
                businessId: businessIds[c.businessIdx],
                title: c.title,
                description: c.description,
                rewardGrams: c.rewardGrams,
                maxSubmissions: c.maxSubmissions,
                currentSubmissions: 0,
                platforms: c.platforms,
                requirements: ["#ad", "@tag", "Photo of product/service", "Genuine recommendation"],
                status: "active",
                verificationMethod: c.verificationMethod as "auto" | "manual",
                createdAt: Date.now(),
            });
            campaignIds.push(id);
        }

        // Create demo submissions
        const submissionData = [
            { campaignIdx: 0, platform: "Instagram", status: "verified" as const, confidence: 96, grams: 0.107 },
            { campaignIdx: 0, platform: "Facebook", status: "verified" as const, confidence: 91, grams: 0.107 },
            { campaignIdx: 2, platform: "Instagram", status: "pending" as const, confidence: undefined, grams: 0.107 },
            { campaignIdx: 3, platform: "Facebook", status: "verified" as const, confidence: 88, grams: 0.107 },
            { campaignIdx: 5, platform: "Instagram", status: "verified" as const, confidence: 94, grams: 0.16 },
        ];

        for (const s of submissionData) {
            const subId = await ctx.db.insert("submissions", {
                campaignId: campaignIds[s.campaignIdx],
                customerId,
                businessId: businessIds[s.campaignIdx],
                postUrl: `https://www.instagram.com/p/demo_${s.campaignIdx}`,
                submissionMethod: "url" as const,
                platform: s.platform,
                status: s.status,
                confidenceScore: s.confidence,
                rewardGrams: s.status === "verified" ? s.grams : 0,
                verifiedAt: s.status === "verified" ? Date.now() : undefined,
                createdAt: Date.now() - (s.campaignIdx * 3600000), // stagger times
            });

            // Record gold transactions for verified
            if (s.status === "verified") {
                await ctx.db.insert("goldTransactions", {
                    userId: customerId,
                    type: "earn",
                    amount: s.grams,
                    submissionId: subId,
                    businessId: businessIds[s.campaignIdx],
                    note: `Earned ${s.grams}g from ${businesses[s.campaignIdx].name}`,
                    createdAt: Date.now() - (s.campaignIdx * 3600000),
                });
            }
        }

        return { success: true, customerId, ownerId, businessIds, campaignIds };
    },
});
