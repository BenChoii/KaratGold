import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// 1 PAXG = 1 troy ounce = 31.1035 grams
const GRAMS_PER_TROY_OUNCE = 31.1035;

// Fallback values
const DEFAULT_GOLD_PRICE_CAD = 237.44;  // CAD per gram (updated to current price)
// const DEFAULT_PAXG_CAD = 7383.84;      // CAD per PAXG (per troy ounce)

// ─── Public query: get the latest cached gold price ───
export const getGoldPrice = query({
    args: {},
    handler: async (ctx) => {
        const latest = await ctx.db.query("goldPrice").order("desc").first();
        return {
            pricePerGram: latest?.pricePerGram ?? DEFAULT_GOLD_PRICE_CAD,
            paxgCad: latest?.paxgCad ?? (latest as any)?.paxgUsd ?? 0,
            usdCadRate: latest?.usdCadRate ?? 0,
            currency: latest?.currency ?? "CAD",
            source: latest?.source ?? "fallback",
            fetchedAt: latest?.fetchedAt ?? null,
        };
    },
});

// ─── Internal mutation: upsert the gold price ───
export const upsertGoldPrice = internalMutation({
    args: {
        pricePerGram: v.float64(),
        paxgCad: v.float64(),
        currency: v.string(),
        source: v.string(),
    },
    handler: async (ctx, args) => {
        // Delete all old entries, keep only the latest
        const existing = await ctx.db.query("goldPrice").collect();
        for (const row of existing) {
            await ctx.db.delete(row._id);
        }

        await ctx.db.insert("goldPrice", {
            pricePerGram: args.pricePerGram,
            paxgCad: args.paxgCad,       // Storing CAD value here
            usdCadRate: 0,               // Not needed with CoinGecko direct CAD
            currency: args.currency,
            source: args.source,
            fetchedAt: Date.now(),
        });
    },
});

// ─── Action: fetch live PAXG price from CoinGecko (free, no key) ───
export const fetchGoldPrice = action({
    args: {},
    handler: async (ctx): Promise<void> => {
        try {
            // CoinGecko free API — returns PAXG price directly in CAD
            // No API key required, generous rate limits
            const resp = await fetch(
                "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=cad",
                { headers: { Accept: "application/json" } }
            );

            if (!resp.ok) {
                console.error("CoinGecko API error:", resp.status);
                return;
            }

            const data = await resp.json();
            const paxgCad = data?.["pax-gold"]?.cad;

            if (!paxgCad || typeof paxgCad !== "number" || paxgCad <= 0) {
                console.error("Invalid PAXG CAD price from CoinGecko:", data);
                return;
            }

            // PAXG = 1 troy ounce = 31.1035 grams
            const pricePerGramCad = Math.round((paxgCad / GRAMS_PER_TROY_OUNCE) * 100) / 100;

            console.log(
                `✅ Gold price fetched: PAXG=$${paxgCad.toFixed(2)} CAD/oz | ` +
                `$${pricePerGramCad.toFixed(2)} CAD/g`
            );

            await ctx.runMutation(internal.goldPrice.upsertGoldPrice, {
                pricePerGram: pricePerGramCad,
                paxgCad: Math.round(paxgCad * 100) / 100,
                currency: "CAD",
                source: "coingecko",
            });
        } catch (err) {
            console.error("Failed to fetch gold price:", err);
        }
    },
});
