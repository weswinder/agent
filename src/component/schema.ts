import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { vChatStatus, vMessage } from "../validators";
import { typedV } from "convex-helpers/validators";

export const schema = defineSchema({
  chats: defineTable({
    domainId: v.optional(v.string()), // Unset for anonymous
    order: v.optional(v.number()), // within a domain
    defaultSystemPrompt: v.optional(v.string()),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: vChatStatus,
  }).index("status_domainId_order", ["status", "domainId", "order"]),
  // TODO: text search on title/ summary
  messages: defineTable({
    chatId: v.id("chats"),
    visibleOrder: v.optional(v.number()), // order amongst visible messages
    order: v.number(), // includes system & tool messages
    message: vMessage,
    fileId: v.optional(v.id("files")),
    visibleParent: v.optional(v.id("messages")),
    visible: v.boolean(), // excludes system & tool messages
    status: v.union(
      v.object({
        kind: v.literal("pending"),
      }),
      v.object({
        kind: v.literal("success"),
      }),
      v.object({
        kind: v.literal("failed"),
        // error: v.string(),
      })
    ),
  })
    // Allows finding successful visible messages in order
    // Also surface pending messages separately to e.g. stream
    .index("chatId_status_visible_visibleOrder", [
      "chatId",
      "status",
      "visible",
      "visibleOrder",
    ])
    // Allows finding all chat messages in order
    // Allows finding all failed messages to evaluate
    .index("status_chatId_order", ["status", "chatId", "order"]),

  files: defineTable({
    storageId: v.string(),
    hash: v.string(),
    refcount: v.number(),
  }).index("hash", ["hash"]),
});

export const vv = typedV(schema);
export { vv as v };

export default schema;
