import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// 1 PAXG = 1 troy ounce = 31.1035 grams
const GRAMS_PER_TROY_OUNCE = 31.1035;

// Fallback value
const DEFAULT_PAXG_USD = 2900; // USD per PAXG (per troy ounce)

// ─── Public query: get the latest cached gold price ───
export const getGoldPrice = query({
    args: {},
    handler: async (ctx) => {
        const latest = await ctx.db.query("goldPrice").order("desc").first();
        return {
            pricePerGram: latest?.pricePerGram ?? (DEFAULT_PAXG_USD / GRAMS_PER_TROY_OUNCE),
            paxgUsd: latest?.paxgUsd ?? DEFAULT_PAXG_USD,
            source: latest?.source ?? "fallback",
            fetchedAt: latest?.fetchedAt ?? null,
        };
    },
});

// ─── Internal mutation: upsert the gold price ───
export const upsertGoldPrice = internalMutation({
    args: {
        pricePerGram: v.float64(),
        paxgUsd: v.float64(),
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
            paxgUsd: args.paxgUsd,
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
            // CoinGecko free API — returns PAXG price in USD
            const resp = await fetch(
                "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd",
                { headers: { Accept: "application/json" } }
            );

            if (!resp.ok) {
                console.error("CoinGecko API error:", resp.status);
                return;
            }

            const data = await resp.json();
            const paxgUsd = data?.["pax-gold"]?.usd;

            if (!paxgUsd || typeof paxgUsd !== "number" || paxgUsd <= 0) {
                console.error("Invalid PAXG USD price from CoinGecko:", data);
                return;
            }

            // PAXG = 1 troy ounce = 31.1035 grams
            const pricePerGramUsd = Math.round((paxgUsd / GRAMS_PER_TROY_OUNCE) * 100) / 100;

            console.log(
                `Gold price fetched: PAXG=$${paxgUsd.toFixed(2)} USD/oz | ` +
                `$${pricePerGramUsd.toFixed(2)} USD/g`
            );

            await ctx.runMutation(internal.goldPrice.upsertGoldPrice, {
                pricePerGram: pricePerGramUsd,
                paxgUsd: Math.round(paxgUsd * 100) / 100,
                source: "coingecko",
            });
        } catch (err) {
            console.error("Failed to fetch gold price:", err);
        }
    },
});
