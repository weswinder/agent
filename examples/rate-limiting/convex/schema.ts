import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Just an example of tracking usage separately from rate limiting.
  usage: defineTable({
    userId: v.string(),
    totalTokens: v.number(),
  }).index("by_user", ["userId"]),
});
