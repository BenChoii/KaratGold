import { httpRouter } from "convex/server";
import { stripeWebhook } from "./stripe";
import { connectWebhook } from "./stripeConnect";

const http = httpRouter();

http.route({
    path: "/stripe-webhook",
    method: "POST",
    handler: stripeWebhook,
});

http.route({
    path: "/stripe-connect-webhook",
    method: "POST",
    handler: connectWebhook,
});

export default http;
