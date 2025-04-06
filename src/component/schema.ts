import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { vChatStatus, vMessage, vMessageStatus, vStep } from "../validators";
import { typedV } from "convex-helpers/validators";
import vectorTables, { vVectorId } from "./vector/tables";

export const schema = defineSchema({
  chats: defineTable({
    userId: v.optional(v.string()), // Unset for anonymous
    order: v.optional(v.number()), // within a domain
    defaultSystemPrompt: v.optional(v.string()),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: vChatStatus,
    // If this is a chat continuation, we can use this to find context from
    // the parent chat(s). There are multiple if the chat is a merging of
    // multiple chats.
    parentChatIds: v.optional(v.array(v.id("chats"))),
  }).index("status_userId_order", ["status", "userId", "order"]),
  // TODO: text search on title/ summary
  messages: defineTable({
    userId: v.optional(v.string()), // useful for future indexes (text search)
    chatId: v.id("chats"),
    agentName: v.optional(v.string()),
    message: v.optional(vMessage),
    model: v.optional(v.string()),
    text: v.optional(v.string()),
    embeddingId: v.optional(vVectorId),
    // TODO: add sub-messages back in? or be able to skip them?
    tool: v.boolean(),
    order: v.optional(v.number()), // Set when the message is finished
    fileId: v.optional(v.id("files")),
    status: vMessageStatus,
  })
    // Allows finding successful visible messages in order
    // Also surface pending messages separately to e.g. stream
    .index("chatId_status_tool_order", ["chatId", "status", "tool", "order"])
    // Allows finding all chat messages in order
    // Allows finding all failed messages to evaluate
    .index("status_chatId_order", ["status", "chatId", "order"])
    // Allows text search on message content
    .searchIndex("text_search", {
      searchField: "text",
      filterFields: ["userId", "chatId"],
    }),

  steps: defineTable({
    chatId: v.id("chats"),
    messageId: v.id("messages"),
    order: v.number(), // parent message order
    stepOrder: v.number(), // step order
    step: vStep,
    fileId: v.optional(v.id("files")),
    status: vMessageStatus,
  })
    .index("chatId_messageId_stepOrder", ["chatId", "messageId", "stepOrder"])
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
  ...vectorTables,
});

export const vv = typedV(schema);
export { vv as v };

export default schema;
