// ============================================================
// Payments are handled on-chain via Solana / PAXG.
// Stripe has been fully removed from KaratGold.
// Business funding: PAXG sent to escrow wallet.
// Customer cashout: PAXG sent to user's Solana wallet.
// ============================================================

import { httpAction } from "./_generated/server";

// Webhook stub — kept so the HTTP route in http.ts doesn't break.
export const stripeWebhook = httpAction(async (_ctx, _request) => {
    return new Response("Payments are handled on-chain via Solana/PAXG.", { status: 200 });
});
