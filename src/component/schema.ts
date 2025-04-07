import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { vChatStatus, vMessage, vMessageStatus, vStep } from "../validators";
import { typedV } from "convex-helpers/validators";
import vectorTables, { vVectorId } from "./vector/tables";

export const schema = defineSchema({
  chats: defineTable({
    userId: v.optional(v.string()), // Unset for anonymous
    order: v.optional(v.number()), // within a domain
    // TODO: is this bubbling up in continue?
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
    id: v.optional(v.string()), // external id, e.g. from Vercel AI SDK
    userId: v.optional(v.string()), // useful for future indexes (text search)
    chatId: v.optional(v.id("chats")),
    threadId: v.optional(v.id("messages")),
    stepId: v.optional(v.id("steps")),
    agentName: v.optional(v.string()),
    message: v.optional(vMessage),
    model: v.optional(v.string()),
    text: v.optional(v.string()),
    embeddingId: v.optional(vVectorId),
    // TODO: add sub-messages back in? or be able to skip them?
    tool: v.boolean(),
    // Repeats until a non-tool message.
    // Unset if it's not in a chat.
    order: v.optional(v.number()),
    stepOrder: v.optional(v.number()),
    fileId: v.optional(v.id("files")),
    status: vMessageStatus,
  })
    // Allows finding successful visible messages in order
    // Also surface pending messages separately to e.g. stream
    .index("chatId_status_tool_order_stepOrder", [
      "chatId",
      "status",
      "tool",
      "order",
      "stepOrder",
    ])
    // Allows finding all threaded messages in order
    // Allows finding all failed messages to evaluate
    // .index("status_threadId_order_stepOrder", [
    //   "status",
    //   "threadId",
    //   "order",
    //   "stepOrder",
    // ])
    // Allows text search on message content
    .searchIndex("text_search", {
      searchField: "text",
      filterFields: ["userId", "chatId"],
    })
    // Allows finding messages by vector embedding id
    .index("embeddingId", ["embeddingId"]),

  steps: defineTable({
    chatId: v.id("chats"),
    // Could be different from the order if we fail.
    parentMessageId: v.id("messages"),
    order: v.number(), // parent message order
    stepOrder: v.number(), // step order
    step: vStep,
    status: vMessageStatus,
  })
    .index("status_chatId_order_stepOrder", [
      "status",
      "chatId",
      "order",
      "stepOrder",
    ])
    .index("parentMessageId_order_stepOrder", [
      "parentMessageId",
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
