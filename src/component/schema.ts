import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { vMessage } from "../validators";

export default defineSchema({
  chats: defineTable({
    domainId: v.optional(v.string()), // Unset for anonymous
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived")),
  }).index("domainId", ["domainId"]),
  // TODO: text search on title/ summary
  messages: defineTable({
    chatId: v.id("chats"),
    visibleOrder: v.number(), // excludes system & tool messages
    totalOrder: v.number(), // includes system & tool messages
    message: vMessage,
    fileId: v.optional(v.id("files")),
    // Denormalized due to tool content being an array
    type: v.string(), // tool-call, file, etc.
  })
    .index("chatId_role_visibleOrder", [
      "chatId",
      "message.role",
      "visibleOrder",
    ])
    .index("chatId_totalOrder", ["chatId", "totalOrder"]),

  files: defineTable({
    storageId: v.string(),
    hash: v.string(),
    refcount: v.number(),
  }).index("hash", ["hash"]),
});
