import { httpRouter } from "convex/server";
import { streamHttpAction } from "./example";
import { corsRouter } from "convex-helpers/server/cors";

const http = httpRouter();

const cors = corsRouter(http, {
  allowCredentials: true,
  allowedHeaders: ["Authorization", "Content-Type"],
});

cors.route({
  path: "/streamText",
  method: "POST",
  handler: streamHttpAction,
});

// Convex expects the router to be the default export of `convex/http.js`.
export default http;
