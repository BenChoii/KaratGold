import { v } from "convex/values";
import { query } from "./_generated/server";

// Haversine distance in kilometers
function haversineKm(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// List nearby campaigns for the discovery/explore page
// Combines physical businesses (by proximity) and service area businesses (by city match)
export const listNearby = query({
    args: {
        userLat: v.optional(v.float64()),
        userLng: v.optional(v.float64()),
        userCity: v.optional(v.string()),
        category: v.optional(v.string()),
        search: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Get all active campaigns
        const campaigns = await ctx.db
            .query("campaigns")
            .withIndex("by_status", (q) => q.eq("status", "active"))
            .collect();

        // Get gold price for CAD conversion
        const goldPrice = await ctx.db.query("goldPrice").order("desc").first();
        const pricePerOunce = goldPrice?.paxgCad ?? 7384;

        // Enrich campaigns with business data + distance
        const enriched = await Promise.all(
            campaigns.map(async (campaign) => {
                const business = await ctx.db.get(campaign.businessId);
                if (!business) return null;

                const remaining = campaign.maxSubmissions - campaign.currentSubmissions;
                if (remaining <= 0) return null;

                // Category filter
                if (args.category && args.category !== "all") {
                    const normalizedCategory = business.category.toLowerCase();
                    const filterCategory = args.category.toLowerCase();
                    if (!normalizedCategory.includes(filterCategory)) return null;
                }

                // Search filter
                if (args.search) {
                    const q = args.search.toLowerCase();
                    const matchesSearch =
                        business.name.toLowerCase().includes(q) ||
                        business.category.toLowerCase().includes(q) ||
                        business.location.toLowerCase().includes(q) ||
                        campaign.title.toLowerCase().includes(q);
                    if (!matchesSearch) return null;
                }

                // Calculate distance
                let distanceKm: number | null = null;
                const locType = business.locationType ?? "physical";

                if (locType === "physical" && business.latitude && business.longitude) {
                    if (args.userLat && args.userLng) {
                        distanceKm = haversineKm(
                            args.userLat, args.userLng,
                            business.latitude, business.longitude
                        );
                    }
                } else if (locType === "service_area" && business.serviceAreas) {
                    // For service area businesses, check if user's city is in their service areas
                    if (args.userCity) {
                        const userCityLower = args.userCity.toLowerCase();
                        const servesCity = business.serviceAreas.some(
                            (area) => area.toLowerCase() === userCityLower
                        );
                        // If they serve the user's city, set a nominal distance
                        // so they appear in results but after nearby physical businesses
                        if (servesCity) {
                            distanceKm = 0; // "in your area"
                        } else {
                            return null; // Don't show service area businesses outside their areas
                        }
                    }
                    // If no userCity provided, still show service area businesses
                    distanceKm = distanceKm ?? null;
                }

                const rewardCad = Math.round(campaign.rewardGrams * pricePerOunce * 100) / 100;

                return {
                    _id: campaign._id,
                    title: campaign.title,
                    description: campaign.description,
                    rewardGrams: campaign.rewardGrams,
                    rewardCad,
                    maxSubmissions: campaign.maxSubmissions,
                    currentSubmissions: campaign.currentSubmissions,
                    remaining,
                    platforms: campaign.platforms,
                    requirements: campaign.requirements,
                    currencyMode: campaign.currencyMode ?? "gold",
                    createdAt: campaign.createdAt,
                    // Business info
                    businessId: business._id,
                    businessName: business.name,
                    businessCategory: business.category,
                    businessLocation: business.location,
                    locationType: locType,
                    serviceAreas: business.serviceAreas,
                    instagramHandle: business.instagramHandle,
                    facebookHandle: business.facebookHandle,
                    latitude: locType === "physical" ? business.latitude : null,
                    longitude: locType === "physical" ? business.longitude : null,
                    // Distance
                    distanceKm: distanceKm !== null
                        ? Math.round(distanceKm * 10) / 10
                        : null,
                    // Verification method
                    verificationMethod: campaign.verificationMethod ?? (business.verificationTier === "auto" ? "auto" : "manual"),
                };
            })
        );

        // Filter nulls and sort: proximity first, then reward amount (descending)
        const results = enriched.filter(Boolean) as NonNullable<typeof enriched[number]>[];

        results.sort((a, b) => {
            // Campaigns with known distance come first
            if (a.distanceKm !== null && b.distanceKm === null) return -1;
            if (a.distanceKm === null && b.distanceKm !== null) return 1;
            // If both have distance, sort by proximity
            if (a.distanceKm !== null && b.distanceKm !== null) {
                if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
            }
            // Then by reward (highest first)
            return b.rewardCad - a.rewardCad;
        });

        return results;
    },
});

// Get all unique business categories for filter chips
export const getCategories = query({
    args: {},
    handler: async (ctx) => {
        const businesses = await ctx.db.query("businesses").collect();
        const categories = new Set(businesses.map((b) => b.category));
        return Array.from(categories).sort();
    },
});
