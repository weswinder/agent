import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { vChatStatus, vMessage, vMessageStatus } from "../validators";
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
    message: v.optional(vMessage),
    order: v.number(), // Non-step messages only, will repeat for sub-steps.
    isStep: v.boolean(), // excludes system & tool messages
    stepOrder: v.number(), // Under a message there can be steps (tool calls)
    fileId: v.optional(v.id("files")),
    status: vMessageStatus,
  })
    // Allows finding successful visible messages in order
    // Also surface pending messages separately to e.g. stream
    .index("chatId_status_isStep_order_stepOrder", [
      "chatId",
      "status",
      "isStep",
      "order",
      "stepOrder",
    ])
    // Allows finding all chat messages in order
    // Allows finding all failed messages to evaluate
    .index("status_chatId_order_stepOrder", [
      "status",
      "chatId",
      "order",
      "stepOrder",
    ]),

  files: defineTable({
    storageId: v.string(),
    hash: v.string(),
    refcount: v.number(),
  })
    .index("hash", ["hash"])
    .index("refcount", ["refcount"]),
});

export const vv = typedV(schema);
export { vv as v };

export default schema;
