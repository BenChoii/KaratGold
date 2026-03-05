import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

const crons = cronJobs();

// Fetch live PAXG gold price every 4 hours
crons.interval(
    "fetch-gold-price",
    { hours: 4 },
    api.goldPrice.fetchGoldPrice,
);

// Deactivate businesses with no campaign activity in 30 days (daily at 3am UTC)
crons.cron(
    "deactivate stale businesses",
    "0 3 * * *",
    internal.tagScanner.deactivateStaleBusinesses,
);

// Auto-approve pending manual submissions older than 24 hours (every hour)
crons.interval(
    "auto approve stale pending",
    { hours: 1 },
    internal.submissions.autoApproveStalePending,
);

export default crons;
