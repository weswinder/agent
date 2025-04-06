import { assert, omit, pick } from "convex-helpers";
import { paginator } from "convex-helpers/server/pagination";
import { mergedStream, stream } from "convex-helpers/server/stream";
import { nullable, partial } from "convex-helpers/validators";
import { Infer, ObjectType } from "convex/values";
import { DEFAULT_MESSAGE_RANGE, extractText, isTool } from "../shared.js";
import {
  Message,
  MessageWithFileAndId,
  vAssistantMessage,
  vChatStatus,
  vMessageStatus,
  vMessageWithFileAndId,
  vSearchOptions,
  vStep,
  vStepWithMessagesWithFileAndId,
  vToolMessage,
} from "../validators.js";
import { api, internal } from "./_generated/api.js";
import { Doc, Id } from "./_generated/dataModel.js";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  MutationCtx,
  query,
  QueryCtx,
} from "./_generated/server.js";
import { schema, v } from "./schema.js";
import {
  getVectorTableName,
  VectorDimension,
  VectorDimensions,
  vVectorId,
} from "./vector/tables.js";

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
    const latestChat = await mergedStream(streams, ["order"]).first();
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
  returns: v.boolean(),
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
        stream(ctx.db, schema)
          .query("messages")
          .withIndex("chatId_status_tool_order", (q) =>
            q.eq("chatId", c._id).eq("status", "success")
          ),
      ["tool", "order"]
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

const deleteChatArgs = {
  chatId: v.id("chats"),
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
};
type DeleteChatArgs = ObjectType<typeof deleteChatArgs>;
const deleteChatReturns = {
  cursor: v.string(),
  isDone: v.boolean(),
};
type DeleteChatReturns = ObjectType<typeof deleteChatReturns>;

export const deleteAllForChatIdSync = action({
  args: deleteChatArgs,
  handler: async (ctx, args) => {
    const result: DeleteChatReturns = await ctx.runMutation(
      internal.messages._deletePageForChatId,
      { chatId: args.chatId, cursor: args.cursor, limit: args.limit }
    );
    return result;
  },
  returns: deleteChatReturns,
});

export const deleteAllForChatIdAsync = mutation({
  args: deleteChatArgs,
  handler: async (ctx, args) => {
    const result = await deletePageForChatIdHandler(ctx, args);
    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, api.messages.deleteAllForChatIdAsync, {
        chatId: args.chatId,
        cursor: result.cursor,
      });
    }
    return result;
  },
  returns: deleteChatReturns,
});

export const _deletePageForChatId = internalMutation({
  args: deleteChatArgs,
  handler: deletePageForChatIdHandler,
  returns: deleteChatReturns,
});

async function deletePageForChatIdHandler(
  ctx: MutationCtx,
  args: DeleteChatArgs
): Promise<DeleteChatReturns> {
  const messages = await stream(ctx.db, schema)
    .query("messages")
    .withIndex("chatId_status_tool_order", (q) =>
      q.eq("chatId", args.chatId).eq("status", "success")
    )
    .paginate({
      numItems: args.limit ?? 100,
      cursor: args.cursor ?? null,
    });
  await Promise.all(messages.page.map((m) => deleteMessage(ctx, m)));
  await ctx.db.delete(args.chatId);
  return {
    cursor: messages.continueCursor,
    isDone: messages.isDone,
  };
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

const addMessagesArgs = {
  chatId: v.id("chats"),
  stepId: v.optional(v.id("steps")),
  parentMessageId: v.optional(v.id("messages")),
  messages: v.array(vMessageWithFileAndId),
  model: v.optional(v.string()),
  agentName: v.optional(v.string()),
  pending: v.optional(v.boolean()),
  failPendingSteps: v.optional(v.boolean()),
};
export const addMessages = mutation({
  args: addMessagesArgs,
  handler: addMessagesHandler,
  returns: v.object({
    messages: v.array(v.doc("messages")),
    pending: v.optional(v.doc("messages")),
  }),
});
async function addMessagesHandler(
  ctx: MutationCtx,
  args: ObjectType<typeof addMessagesArgs>
) {
  const chat = await ctx.db.get(args.chatId);
  assert(chat, `Chat ${args.chatId} not found`);
  const { failPendingSteps, pending, messages, parentMessageId, ...rest } =
    args;
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
  const maxMessage = await getMaxMessage(ctx, args.chatId);
  // If the previous message isn't our parent, we make a new thread.
  const threadId =
    parentMessageId && maxMessage?._id === parentMessageId
      ? maxMessage.threadId
      : parentMessageId;
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
        threadId,
        userId: chat.userId,
        order,
        tool,
        text,
        fileId,
        status: pending ? "pending" : "success",
      });
      toReturn.push((await ctx.db.get(messageId))!);
    }
  }
  return { messages: toReturn };
}

async function getMaxMessage(ctx: QueryCtx, chatId: Id<"chats">) {
  return ctx.db
    .query("messages")
    .withIndex("chatId_status_tool_order", (q) =>
      q.eq("chatId", chatId).eq("status", "success").eq("tool", false)
    )
    .order("desc")
    .first();
}

const addStepsArgs = {
  chatId: v.id("chats"),
  messageId: v.id("messages"),
  steps: v.array(vStepWithMessagesWithFileAndId),
  failPendingSteps: v.optional(v.boolean()),
};

export const addSteps = mutation({
  args: addStepsArgs,
  returns: v.array(v.doc("steps")),
  handler: addStepsHandler,
});
async function addStepsHandler(
  ctx: MutationCtx,
  args: ObjectType<typeof addStepsArgs>
) {
  const parentMessage = await ctx.db.get(args.messageId);
  assert(parentMessage, `Message ${args.messageId} not found`);
  assert(
    parentMessage.status === "success",
    `${args.messageId} is not a success, it is ${parentMessage.status}`
  );
  const order = parentMessage.order;
  assert(order !== undefined, `${args.messageId} has no order`);
  let steps = await ctx.db
    .query("steps")
    .withIndex("status_chatId_order_stepOrder", (q) =>
      // TODO: fetch pending, and commit later
      q.eq("status", "success").eq("chatId", args.chatId).eq("order", order)
    )
    .collect();
  if (args.failPendingSteps) {
    for (const step of steps) {
      if (step.status === "pending") {
        await ctx.db.patch(step._id, { status: "failed" });
      }
    }
    steps = steps.filter((s) => s.status === "success");
  }
  let nextStepOrder = (steps.at(-1)?.stepOrder ?? -1) + 1;
  for (const { step, messages } of args.steps) {
    const stepId = await ctx.db.insert("steps", {
      chatId: args.chatId,
      parentMessageId: args.messageId,
      order,
      stepOrder: nextStepOrder,
      status: "pending",
      step,
    });
    await addMessagesHandler(ctx, {
      chatId: args.chatId,
      parentMessageId: args.messageId,
      stepId,
      messages,
      model: parentMessage.model,
      agentName: parentMessage.agentName,
      pending: true,
      failPendingSteps: false,
    });
    steps.push((await ctx.db.get(stepId))!);
    nextStepOrder++;
  }
  return steps;
}

export const rollbackMessage = mutation({
  args: {
    messageId: v.id("messages"),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { messageId, error }) => {
    const message = await ctx.db.get(messageId);
    assert(message, `Message ${messageId} not found`);
    await ctx.db.patch(messageId, {
      status: "failed",
      text: error ?? message.text,
    });
  },
});

export const commitMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.null(),
  handler: async (ctx, { messageId }) => {
    const message = await ctx.db.get(messageId);
    assert(message, `Message ${messageId} not found`);

    const allSteps = await ctx.db
      .query("steps")
      .withIndex("parentMessageId", (q) => q.eq("parentMessageId", messageId))
      .collect();
    for (const step of allSteps) {
      if (step.status === "pending") {
        await ctx.db.patch(step._id, { status: "success" });
      }
    }
    const order = message.order!;
    const messages = await ctx.db
      .query("messages")
      .withIndex("status_chatId_order", (q) =>
        q
          .eq("status", "pending")
          .eq("chatId", message.chatId)
          .eq("order", order)
      )
      .collect();
    for (const message of messages) {
      await ctx.db.patch(message._id, { status: "success" });
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
    const messages = await mergedStream(streams, ["order"]).paginate({
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
    ...vSearchOptions.fields,
  },
  returns: v.array(v.doc("messages")),
  handler: async (ctx, args): Promise<Doc<"messages">[]> => {
    assert(args.userId || args.chatId, "Specify userId or chatId");
    const limit = args.limit;
    let textSearchMessages: Doc<"messages">[] | undefined;
    if (args.text) {
      textSearchMessages = await ctx.runQuery(api.messages.textSearch, {
        userId: args.userId,
        chatId: args.chatId,
        text: args.text,
        limit,
      });
    }
    if (args.vector) {
      const dimension = args.vector.length as VectorDimension;
      if (!VectorDimensions.includes(dimension)) {
        throw new Error(`Unsupported vector dimension: ${dimension}`);
      }
      const model = args.vectorModel ?? "unknown";
      const tableName = getVectorTableName(dimension);
      const vectors = (
        await ctx.vectorSearch(tableName, "vector", {
          vector: args.vector,
          filter: (q) =>
            args.userId
              ? q.eq("model_kind_userId", [model, "chat", args.userId])
              : q.eq("model_kind_chatId", [model, "chat", args.chatId!]),
          limit,
        })
      ).filter((v) => v._score > 0.5);
      // Reciprocal rank fusion
      const k = 10;
      const textEmbeddingIds = textSearchMessages?.map((m) => m.embeddingId);
      const vectorScores = vectors
        .map((v, i) => ({
          id: v._id,
          score:
            1 / (i + k) +
            1 / (textEmbeddingIds?.indexOf(v._id) ?? Infinity + k),
        }))
        .sort((a, b) => b.score - a.score);
      const vectorIds = vectorScores.slice(0, limit).map((v) => v.id);

      const messages: Doc<"messages">[] = await ctx.runQuery(
        internal.messages._fetchVectorMessages,
        {
          userId: args.userId,
          chatId: args.chatId,
          vectorIds,
          textSearchMessages: textSearchMessages
            ?.filter((m) => !vectorIds.includes(m.embeddingId!))
            .slice(0, limit - vectorIds.length),
          messageRange: args.messageRange ?? DEFAULT_MESSAGE_RANGE,
        }
      );
      return messages;
    }
    return textSearchMessages?.flat() ?? [];
  },
});

export const _fetchVectorMessages = internalQuery({
  args: {
    userId: v.optional(v.string()),
    chatId: v.optional(v.id("chats")),
    vectorIds: v.array(vVectorId),
    textSearchMessages: v.optional(v.array(v.doc("messages"))),
    messageRange: v.object({ before: v.number(), after: v.number() }),
  },
  returns: v.array(v.doc("messages")),
  handler: async (ctx, args): Promise<Doc<"messages">[]> => {
    const messages = (
      await Promise.all(
        args.vectorIds.map((embeddingId) =>
          ctx.db
            .query("messages")
            .withIndex("embeddingId", (q) => q.eq("embeddingId", embeddingId))
            .filter(
              (q) =>
                args.userId
                  ? q.eq("userId", args.userId)
                  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    q.eq("chatId", args.chatId as any) // not sure why it's failing...
            )
            .first()
        )
      )
    ).filter((m): m is Doc<"messages"> => m !== undefined);
    messages.push(...(args.textSearchMessages ?? []));
    messages.sort((a, b) => a.order! - b.order!);
    // Fetch the surrounding messages
    const included: Record<Id<"chats">, Set<number>> = {};
    for (const m of messages) {
      if (!included[m.chatId]) {
        included[m.chatId] = new Set();
      }
      included[m.chatId].add(m.order!);
    }
    const ranges: Record<Id<"chats">, Doc<"messages">[]> = {};
    const { before, after } = args.messageRange;
    for (const m of messages) {
      const order = m.order!;
      let earliest = order - before;
      let latest = order + after;
      for (; earliest <= latest; earliest++) {
        if (!included[m.chatId].has(earliest)) {
          break;
        }
      }
      for (; latest >= earliest; latest--) {
        if (!included[m.chatId].has(latest)) {
          break;
        }
      }
      for (let i = earliest; i <= latest; i++) {
        included[m.chatId].add(i);
      }
      if (earliest !== latest) {
        const surrounding = await ctx.db
          .query("messages")
          .withIndex("chatId_status_tool_order", (q) =>
            q
              .eq("chatId", m.chatId)
              .eq("status", "success")
              .eq("tool", false)
              .gt("order", earliest)
              .lt("order", latest)
          )
          .collect();
        if (!ranges[m.chatId]) {
          ranges[m.chatId] = [];
        }
        ranges[m.chatId].push(...surrounding);
      }
    }
    return Object.values(ranges)
      .map((r) => r.sort((a, b) => a.order! - b.order!))
      .flat();
  },
});

// returns ranges of messages in order of text search relevance,
// excluding duplicates in later ranges.
export const textSearch = query({
  args: {
    chatId: v.optional(v.id("chats")),
    userId: v.optional(v.string()),
    text: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    assert(args.userId || args.chatId, "Specify userId or chatId");
    const messages = await ctx.db
      .query("messages")
      .withSearchIndex("text_search", (q) =>
        args.userId
          ? q.search("text", args.text).eq("userId", args.userId)
          : q.search("text", args.text).eq("chatId", args.chatId!)
      )
      .take(args.limit);
    return messages;
  },
  returns: v.array(v.doc("messages")),
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
