import { schema, v } from "./schema.js";
import {
  action,
  internalMutation,
  mutation,
  MutationCtx,
  query,
} from "./_generated/server.js";
import { omit, pick } from "convex-helpers";
import { vChatStatus, vMessage, vMessageStatus, vStep } from "../validators.js";
import { stream } from "convex-helpers/server/stream";
import { mergedStream } from "convex-helpers/server/stream";
import { nullable, partial } from "convex-helpers/validators";
import { assert } from "convex-helpers";
import { internal } from "./_generated/api.js";
import { ObjectType } from "convex/values";
import { Doc } from "./_generated/dataModel.js";
import { paginator } from "convex-helpers/server/pagination";
import { isTool, extractText } from "../shared.js";

export const getChat = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.chatId);
  },
  returns: v.union(v.doc("chats"), v.null()),
});

export const getChatsByUserId = query({
  args: {
    userId: v.string(),
    // Note: the other arguments cannot change from when the cursor was created.
    cursor: v.optional(v.union(v.string(), v.null())),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    statuses: v.optional(v.array(vChatStatus)),
  },
  handler: async (ctx, args) => {
    const streams = (args.statuses ?? ["active"]).map((status) =>
      stream(ctx.db, schema)
        .query("chats")
        .withIndex("status_userId_order", (q) =>
          q
            .eq("status", status)
            .eq("userId", args.userId)
            .gte("order", args.offset ?? 0)
        )
    );
    const chats = await mergedStream(streams, ["order", "stepOrder"]).paginate({
      numItems: args.limit ?? 100,
      cursor: args.cursor ?? null,
    });
    return {
      chats: chats.page,
      continueCursor: chats.continueCursor,
      isDone: chats.isDone,
    };
  },
  returns: v.object({
    chats: v.array(v.doc("chats")),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
});

const vChat = schema.tables.chats.validator;
const statuses = vChat.fields.status.members.map((m) => m.value);

export const createChat = mutation({
  args: omit(vChat.fields, ["order", "status"]),
  handler: async (ctx, args) => {
    const streams = statuses.map((status) =>
      stream(ctx.db, schema)
        .query("chats")
        .withIndex("status_userId_order", (q) =>
          q.eq("status", status).eq("userId", args.userId)
        )
        .order("desc")
    );
    const latestChat = await mergedStream(streams, [
      "order",
      "stepOrder",
    ]).first();
    const order = (latestChat?.order ?? -1) + 1;
    const chatId = await ctx.db.insert("chats", {
      ...args,
      order,
      status: "active",
    });
    return (await ctx.db.get(chatId))!;
  },
  returns: v.doc("chats"),
});

export const updateChat = mutation({
  args: {
    chatId: v.id("chats"),
    patch: v.object(
      partial(
        pick(vChat.fields, [
          "title",
          "summary",
          "defaultSystemPrompt",
          "status",
        ])
      )
    ),
  },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    assert(chat, `Chat ${args.chatId} not found`);
    await ctx.db.patch(args.chatId, args.patch);
    return (await ctx.db.get(args.chatId))!;
  },
  returns: v.doc("chats"),
});

export const archiveChat = mutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    assert(chat, `Chat ${args.chatId} not found`);
    await ctx.db.patch(args.chatId, { status: "archived" });
    return (await ctx.db.get(args.chatId))!;
  },
  returns: v.doc("chats"),
});

export const deleteAllForUserId = action({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    let messagesCursor = null;
    let chatsCursor = null;
    let isDone = false;
    while (!isDone) {
      const result: {
        messagesCursor: string;
        chatsCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(internal.messages._deletePageForUserId, {
        userId: args.userId,
        messagesCursor,
        chatsCursor,
      });
      messagesCursor = result.messagesCursor;
      chatsCursor = result.chatsCursor;
      isDone = result.isDone;
    }
  },
  returns: v.null(),
});

export const deleteAllForUserIdAsync = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const isDone = await deleteAllFroUserIdAsyncHandler(ctx, {
      userId: args.userId,
      messagesCursor: null,
      chatsCursor: null,
    });
    return isDone;
  },
  returns: v.boolean(),
});

const deleteAllArgs = {
  userId: v.string(),
  messagesCursor: nullable(v.string()),
  chatsCursor: nullable(v.string()),
};
type DeleteAllArgs = ObjectType<typeof deleteAllArgs>;
const deleteAllReturns = {
  messagesCursor: v.string(),
  chatsCursor: nullable(v.string()),
  isDone: v.boolean(),
};
type DeleteAllReturns = ObjectType<typeof deleteAllReturns>;

export const _deleteAllForUserIdAsync = internalMutation({
  args: deleteAllArgs,
  handler: deleteAllFroUserIdAsyncHandler,
});

async function deleteAllFroUserIdAsyncHandler(
  ctx: MutationCtx,
  args: DeleteAllArgs
): Promise<boolean> {
  const result = await deletePageForUserId(ctx, args);
  if (!result.isDone) {
    await ctx.scheduler.runAfter(
      0,
      internal.messages._deleteAllForUserIdAsync,
      {
        userId: args.userId,
        messagesCursor: result.messagesCursor,
        chatsCursor: result.chatsCursor,
      }
    );
  }
  return result.isDone;
}

export const _deletePageForUserId = internalMutation({
  args: deleteAllArgs,
  handler: deletePageForUserId,
  returns: deleteAllReturns,
});
async function deletePageForUserId(
  ctx: MutationCtx,
  args: DeleteAllArgs
): Promise<DeleteAllReturns> {
  const streams = statuses.map((status) =>
    stream(ctx.db, schema)
      .query("chats")
      .withIndex("status_userId_order", (q) =>
        q.eq("status", status).eq("userId", args.userId)
      )
      .order("desc")
  );
  const chatStreams = mergedStream(streams, ["order"]);
  const messages = await chatStreams
    .flatMap(
      async (c) =>
        mergedStream(
          [true, false].map((tool) =>
            stream(ctx.db, schema)
              .query("messages")
              .withIndex("chatId_status_tool_order", (q) =>
                q.eq("chatId", c._id).eq("status", "success").eq("tool", tool)
              )
          ),
          ["order"]
        ),
      ["order"]
    )
    .paginate({
      numItems: 100,
      cursor: args.messagesCursor ?? null,
    });
  await Promise.all(messages.page.map((m) => deleteMessage(ctx, m)));
  if (messages.isDone) {
    const chats = await chatStreams.paginate({
      numItems: 100,
      cursor: args.chatsCursor ?? null,
    });
    await Promise.all(chats.page.map((c) => ctx.db.delete(c._id)));
    return {
      messagesCursor: messages.continueCursor,
      chatsCursor: chats.continueCursor,
      isDone: chats.isDone,
    };
  }
  return {
    messagesCursor: messages.continueCursor,
    chatsCursor: null,
    isDone: messages.isDone,
  };
}

async function deleteMessage(ctx: MutationCtx, messageDoc: Doc<"messages">) {
  await ctx.db.delete(messageDoc._id);
  if (messageDoc.fileId) {
    const file = await ctx.db.get(messageDoc.fileId);
    if (file) {
      await ctx.db.patch(messageDoc.fileId, { refcount: file.refcount - 1 });
    }
  }
}

export const getFilesToDelete = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const files = await paginator(ctx.db, schema)
      .query("files")
      .withIndex("refcount", (q) => q.eq("refcount", 0))
      .paginate({
        numItems: args.limit ?? 100,
        cursor: args.cursor ?? null,
      });
    return {
      files: files.page,
      continueCursor: files.continueCursor,
      isDone: files.isDone,
    };
  },
  returns: v.object({
    files: v.array(v.doc("files")),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
});

export const vMessageDoc = schema.tables.messages.validator;
export const messageStatuses = vMessageDoc.fields.status.members.map(
  (m) => m.value
);

export const addMessages = mutation({
  args: {
    chatId: v.id("chats"),
    messages: v.array(
      v.object({
        message: vMessage,
        fileId: v.optional(v.id("files")),
      })
    ),
    model: v.optional(v.string()),
    agentName: v.optional(v.string()),
    addPending: v.optional(v.boolean()),
    failPendingSteps: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    assert(chat, `Chat ${args.chatId} not found`);
    const { failPendingSteps, addPending, messages, ...rest } = args;
    if (failPendingSteps) {
      const pendingMessages = await ctx.db
        .query("messages")
        .withIndex("status_chatId_order", (q) =>
          q.eq("status", "pending").eq("chatId", args.chatId)
        )
        .collect();
      await Promise.all(
        pendingMessages.map((m) => ctx.db.patch(m._id, { status: "failed" }))
      );
    }
    let order: number | undefined;
    const maxMessage = await stream(ctx.db, schema)
      .query("messages")
      .withIndex("chatId_status_tool_order", (q) =>
        q.eq("chatId", args.chatId).eq("status", "success").eq("tool", false)
      )
      .order("desc")
      .first();
    order = maxMessage?.order ?? -1;
    const toReturn: Doc<"messages">[] = [];
    if (messages.length > 0) {
      for (const { message, fileId } of messages) {
        const tool = isTool(message);
        if (!tool) {
          order++;
        }
        const text = extractText(message);
        const messageId = await ctx.db.insert("messages", {
          ...rest,
          userId: chat.userId,
          order,
          tool,
          text,
          fileId,
          status: "success",
        });
        toReturn.push((await ctx.db.get(messageId))!);
      }
    }
    // TODO: kick off batch embedding job
    if (addPending) {
      const pendingId = await ctx.db.insert("messages", {
        ...rest,
        userId: chat.userId,
        order: order + 1,
        tool: false,
        status: "pending",
      });
      const pending = (await ctx.db.get(pendingId))!;
      return { messages: toReturn, pending };
    }
    return { messages: toReturn };
  },
  returns: v.object({
    messages: v.array(v.doc("messages")),
    pending: v.optional(v.doc("messages")),
  }),
});

export const addSteps = mutation({
  args: {
    chatId: v.id("chats"),
    messageId: v.id("messages"),
    steps: v.array(
      v.object({
        step: vStep,
        fileId: v.optional(v.id("files")),
      })
    ),
    failPreviousSteps: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const parentMessage = await ctx.db.get(args.messageId);
    assert(parentMessage, `Message ${args.messageId} not found`);
    assert(
      parentMessage.status === "success",
      `${args.messageId} is not a success, it is ${parentMessage.status}`
    );
    assert(parentMessage.order !== undefined, `${args.messageId} has no order`);
    const steps = await ctx.db
      .query("steps")
      .withIndex("chatId_messageId_stepOrder", (q) =>
        q.eq("chatId", args.chatId).eq("messageId", args.messageId)
      )
      .collect();
    let nextStepOrder;
    if (args.failPreviousSteps) {
      for (const step of steps) {
        await ctx.db.patch(step._id, { status: "failed" });
      }
      nextStepOrder = 0;
    } else {
      nextStepOrder = (steps.at(-1)?.stepOrder ?? -1) + 1;
    }
    const results: Doc<"steps">[] = [];
    for (const { step, fileId } of args.steps) {
      const stepId = await ctx.db.insert("steps", {
        chatId: args.chatId,
        messageId: args.messageId,
        order: parentMessage.order,
        stepOrder: nextStepOrder,
        status: "success",
        fileId,
        step,
      });
      results.push((await ctx.db.get(stepId))!);
      nextStepOrder++;
    }
    return results;
  },
  returns: v.array(v.doc("steps")),
});

export const updateMessage = mutation({
  args: {
    messageId: v.id("messages"),
    message: vMessage,
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    assert(message, `Message ${args.messageId} not found`);
    await ctx.db.patch(args.messageId, {
      message: args.message,
    });
    if (message.status === "pending") {
      await ctx.db.patch(args.messageId, {
        status: "success",
      });
    }
  },
});

export const getChatMessages = query({
  args: {
    chatId: v.id("chats"),
    isTool: v.optional(v.boolean()),
    order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    limit: v.optional(v.number()),
    // Note: the other arguments cannot change from when the cursor was created.
    cursor: v.optional(v.string()),
    statuses: v.optional(v.array(vMessageStatus)),
  },
  handler: async (ctx, args) => {
    const statuses = args.statuses ?? ["success"];
    const isTool = args.isTool;
    const order = args.order ?? "desc";
    const streams =
      isTool !== undefined
        ? statuses.map((status) =>
            stream(ctx.db, schema)
              .query("messages")
              .withIndex("chatId_status_tool_order", (q) =>
                q
                  .eq("chatId", args.chatId)
                  .eq("status", status)
                  .eq("tool", isTool)
              )
              .order(order)
          )
        : statuses.map((status) =>
            stream(ctx.db, schema)
              .query("messages")
              .withIndex("status_chatId_order", (q) =>
                q.eq("status", status).eq("chatId", args.chatId)
              )
              .order(order)
          );
    const messages = await mergedStream(streams, [
      "order",
      "stepOrder",
    ]).paginate({
      numItems: args.limit ?? 100,
      cursor: args.cursor ?? null,
    });
    return {
      messages: messages.page,
      continueCursor: messages.continueCursor,
      isDone: messages.isDone,
    };
  },
  returns: v.object({
    messages: v.array(v.doc("messages")),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
});

export const searchMessages = action({
  args: {
    userId: v.optional(v.string()),
    chatId: v.optional(v.id("chats")),
    vector: v.optional(v.array(v.number())),
    text: v.optional(v.string()),
    topK: v.optional(v.number()),
    messageRange: v.optional(
      v.object({
        before: v.number(),
        after: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    assert(args.userId || args.chatId, "Specify userId or chatId");
    // TODO: implement vector search + text search + w/e else.
    return [];
  },
});

// const vMemoryConfig = v.object({
//   lastMessages: v.optional(v.union(v.number(), v.literal(false))),
//   semanticRecall: v.optional(
//     v.union(
//       v.boolean(),
//       v.object({
//         topK: v.number(),
//         messageRange: v.union(
//           v.number(),
//           v.object({ before: v.number(), after: v.number() }),
//         ),
//       }),
//     ),
//   ),
//   workingMemory: v.optional(
//     v.object({
//       enabled: v.boolean(),
//       template: v.optional(v.string()),
//       use: v.optional(
//         v.union(v.literal("text-stream"), v.literal("tool-call")),
//       ),
//     }),
//   ),
//   threads: v.optional(
//     v.object({
//       generateTitle: v.optional(v.boolean()),
//     }),
//   ),
// });
// const vSelectBy = v.object({
//   vectorSearchString: v.optional(v.string()),
//   last: v.optional(v.union(v.number(), v.literal(false))),
//   include: v.optional(
//     v.array(
//       v.object({
//         id: v.string(),
//         withPreviousMessages: v.optional(v.number()),
//         withNextMessages: v.optional(v.number()),
//       })
//     )
//   ),
// });

// const DEFAULT_MESSAGES_LIMIT = 40; // What pg & upstash do too.

// export const getChatMessagesPage = query({
//   args: {
//     threadId: v.string(),
//     selectBy: v.optional(vSelectBy),
//     // Unimplemented and as far I can tell no storage provider has either.
//     // memoryConfig: v.optional(vMemoryConfig),
//   },
//   handler: async (ctx, args): Promise<SerializedMessage[]> => {
//     const messages = await ctx.db
//       .query("messages")
//       .withIndex("threadId", (q) => q.eq("threadId", args.threadId))
//       .order("desc")
//       .take(args.selectBy?.last ? args.selectBy.last : DEFAULT_MESSAGES_LIMIT);

//     const handled: boolean[] = [];
//     const toFetch: number[] = [];
//     for (const m of messages) {
//       handled[m.threadOrder] = true;
//     }
//     await Promise.all(
//       args.selectBy?.include?.map(async (range) => {
//         const includeDoc = await ctx.db
//           .query("messages")
//           .withIndex("id", (q) => q.eq("id", range.id))
//           .unique();
//         if (!includeDoc) {
//           console.warn(`Message ${range.id} not found`);
//           return;
//         }
//         if (!range.withPreviousMessages && !range.withNextMessages) {
//           messages.push(includeDoc);
//           return;
//         }
//         const order = includeDoc.threadOrder;
//         for (
//           let i = order - (range.withPreviousMessages ?? 0);
//           i < order + (range.withNextMessages ?? 0);
//           i++
//         ) {
//           if (!handled[i]) {
//             toFetch.push(i);
//             handled[i] = true;
//           }
//         }
//       }) ?? []
//     );
//     // sort and find unique numbers in toFetch
//     const uniqueToFetch = [...new Set(toFetch)].sort();
//     // find contiguous ranges in uniqueToFetch
//     const ranges: { start: number; end: number }[] = [];
//     for (let i = 0; i < uniqueToFetch.length; i++) {
//       const start = uniqueToFetch[i];
//       let end = start;
//       while (i + 1 < uniqueToFetch.length && uniqueToFetch[i + 1] === end + 1) {
//         end++;
//         i++;
//       }
//       ranges.push({ start, end });
//     }
//     const fetched = (
//       await Promise.all(
//         ranges.map(async (range) => {
//           return await ctx.db
//             .query("messages")
//             .withIndex("threadId", (q) =>
//               q
//                 .eq("threadId", args.threadId)
//                 .gte("threadOrder", range.start)
//                 .lte("threadOrder", range.end)
//             )
//             .collect();
//         })
//       )
//     ).flat();
//     messages.push(...fetched);
//     return messages.map(messageToSerializedMastra);
//   },
//   returns: v.array(vSerializedMessage),
// });

// export const saveMessages = mutation({
//   args: { messages: v.array(vSerializedMessage) },
//   handler: async (ctx, args) => {
//     const messagesByThreadId: Record<string, SerializedMessage[]> = {};
//     for (const message of args.messages) {
//       messagesByThreadId[message.threadId] = [
//         ...(messagesByThreadId[message.threadId] ?? []),
//         message,
//       ];
//     }
//     for (const threadId in messagesByThreadId) {
//       const lastMessage = await ctx.db
//         .query("messages")
//         .withIndex("threadId", (q) => q.eq("threadId", threadId))
//         .order("desc")
//         .first();
//       let threadOrder = lastMessage?.threadOrder ?? 0;
//       for (const message of messagesByThreadId[threadId]) {
//         threadOrder++;
//         await ctx.db.insert("messages", {
//           ...message,
//           threadOrder,
//         });
//       }
//     }
//   },
//   returns: v.null(),
// });
