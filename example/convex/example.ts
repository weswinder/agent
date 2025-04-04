import { internalMutation, query, mutation } from "./_generated/server";
import { components } from "./_generated/api";
import { ConvexAI } from "@convex-dev/ai";

const ai = new ConvexAI(components.ai, {
  embedder: "test",
});
