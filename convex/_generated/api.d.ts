/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as businesses from "../businesses.js";
import type * as campaigns from "../campaigns.js";
import type * as crons from "../crons.js";
import type * as discovery from "../discovery.js";
import type * as goldPrice from "../goldPrice.js";
import type * as http from "../http.js";
import type * as migrateEmbedSocial from "../migrateEmbedSocial.js";
import type * as rewards from "../rewards.js";
import type * as seed from "../seed.js";
import type * as solana from "../solana.js";
import type * as solanaManager from "../solanaManager.js";
import type * as stripe from "../stripe.js";
import type * as stripeConnect from "../stripeConnect.js";
import type * as submissions from "../submissions.js";
import type * as tagScanner from "../tagScanner.js";
import type * as testQuery from "../testQuery.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai: typeof ai;
  businesses: typeof businesses;
  campaigns: typeof campaigns;
  crons: typeof crons;
  discovery: typeof discovery;
  goldPrice: typeof goldPrice;
  http: typeof http;
  migrateEmbedSocial: typeof migrateEmbedSocial;
  rewards: typeof rewards;
  seed: typeof seed;
  solana: typeof solana;
  solanaManager: typeof solanaManager;
  stripe: typeof stripe;
  stripeConnect: typeof stripeConnect;
  submissions: typeof submissions;
  tagScanner: typeof tagScanner;
  testQuery: typeof testQuery;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
