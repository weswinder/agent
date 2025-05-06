import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  vThreadStatus,
  vMessage,
  vMessageStatus,
  vStep,
} from "../validators.js";
import { typedV } from "convex-helpers/validators";
import vectorTables, { vVectorId } from "./vector/tables.js";

export const schema = defineSchema({
  threads: defineTable({
    userId: v.optional(v.string()), // Unset for anonymous
    // TODO: is this bubbling up in continue?
    defaultSystemPrompt: v.optional(v.string()),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: vThreadStatus,
    // If this is a thread continuation, we can use this to find context from
    // the parent thread(s). There are multiple if the thread is a merging of
    // multiple threads.
    parentThreadIds: v.optional(v.array(v.id("threads"))),
    // DEPRECATED
    order: /*DEPRECATED*/ v.optional(v.number()),
  }).index("userId", ["userId"]),
  // TODO: text search on title/ summary
  messages: defineTable({
    id: v.optional(v.string()), // external id, e.g. from Vercel AI SDK
    userId: v.optional(v.string()), // useful for future indexes (text search)
    threadId: v.id("threads"),
    parentMessageId: v.optional(v.id("messages")),
    stepId: v.optional(v.id("steps")),
    agentName: v.optional(v.string()),
    message: v.optional(vMessage),
    error: v.optional(v.string()),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
    text: v.optional(v.string()),
    embeddingId: v.optional(vVectorId),
    // TODO: add sub-messages back in? or be able to skip them?
    tool: v.boolean(),
    // Repeats until a non-tool message.
    // Unset if it's not in a thread.
    order: v.number(),
    stepOrder: v.number(),
    fileId: v.optional(v.id("files")),
    status: vMessageStatus,
  })
    // Allows finding successful visible messages in order
    // Also surface pending messages separately to e.g. stream
    .index("threadId_status_tool_order_stepOrder", [
      "threadId",
      "status",
      "tool",
      "order",
      "stepOrder",
    ])
    .index("userId_status_tool_order_stepOrder", [
      "userId",
      "status",
      "tool",
      "order",
      "stepOrder",
    ])
    // Allows finding all threaded messages in order
    // Allows finding all failed messages to evaluate
    // .index("status_parentMessageId_order_stepOrder", [
    //   "status",
    //   "parentMessageId",
    //   "order",
    //   "stepOrder",
    // ])
    // Allows text search on message content
    .searchIndex("text_search", {
      searchField: "text",
      filterFields: ["userId", "threadId"],
    })
    // Allows finding messages by vector embedding id
    .index("embeddingId", ["embeddingId"]),

  steps: defineTable({
    threadId: v.id("threads"),
    // Could be different from the order if we fail.
    parentMessageId: v.id("messages"),
    order: v.number(), // parent message order
    stepOrder: v.number(), // step order
    step: vStep,
    status: vMessageStatus,
  })
    .index("status_threadId_order_stepOrder", [
      "status",
      "threadId",
      "order",
      "stepOrder",
    ])
    .index("parentMessageId_order_stepOrder", [
      "parentMessageId",
      "order",
      "stepOrder",
    ]),

  memories: defineTable({
    threadId: v.optional(v.id("threads")),
    userId: v.optional(v.string()),
    memory: v.string(),
    embeddingId: v.optional(vVectorId),
  })
    .index("threadId", ["threadId"])
    .index("userId", ["userId"])
    .index("embeddingId", ["embeddingId"]),

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
