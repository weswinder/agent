import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { streamHttpAction } from "./example";

const http = httpRouter();

http.route({
  path: "/streamText",
  method: "GET",
  handler: streamHttpAction,
});

// Convex expects the router to be the default export of `convex/http.js`.
export default http;
