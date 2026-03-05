import { httpRouter } from "convex/server";
import { stripeWebhook } from "./stripe";

const http = httpRouter();

http.route({
    path: "/stripe",
    method: "POST",
    handler: stripeWebhook,
});

export default http;
