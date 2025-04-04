import { internalMutation, query, mutation } from "./_generated/server";
import { components } from "./_generated/api";
import { ConvexAI } from "@convex-dev/agent";

const agent = new ConvexAI(components.agent, {
  embedder: "test",
});
