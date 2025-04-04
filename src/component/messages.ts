import { schema, v } from "./schema.js";
import {
  action,
  internalMutation,
  mutation,
  MutationCtx,
  query,
  QueryCtx,
} from "./_generated/server.js";
import { omit, pick } from "convex-helpers";
import {
  Message,
  vChatStatus,
  vMessage,
  vMessageStatus,
} from "../validators.js";
import { stream } from "convex-helpers/server/stream";
import { mergedStream } from "convex-helpers/server/stream";
import { nullable, partial } from "convex-helpers/validators";
import { assert } from "convex-helpers";
import { internal } from "./_generated/api.js";
import { ObjectType } from "convex/values";
import { Doc, Id } from "./_generated/dataModel.js";
import { paginator } from "convex-helpers/server/pagination";

export const getChat = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.chatId);
  },
  returns: v.union(v.doc("chats"), v.null()),
});

export const getChatsByDomainId = query({
  args: {
    domainId: v.string(),
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
        .withIndex("status_domainId_order", (q) =>
          q
            .eq("status", status)
            .eq("domainId", args.domainId)
            .gte("order", args.offset ?? 0)
        )
    );
    const chats = await mergedStream(streams, ["order"]).paginate({
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
        .withIndex("status_domainId_order", (q) =>
          q.eq("status", status).eq("domainId", args.domainId)
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

export const deleteAllForDomainId = action({
  args: { domainId: v.string() },
  handler: async (ctx, args) => {
    let messagesCursor = null;
    let chatsCursor = null;
    let isDone = false;
    while (!isDone) {
      const result: {
        messagesCursor: string;
        chatsCursor: string | null;
        isDone: boolean;
      } = await ctx.runMutation(internal.messages._deletePageForDomainId, {
        domainId: args.domainId,
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

export const deleteAllForDomainIdAsync = mutation({
  args: {
    domainId: v.string(),
  },
  handler: async (ctx, args) => {
    const isDone = await deleteAllFroDomainIdAsyncHandler(ctx, {
      domainId: args.domainId,
      messagesCursor: null,
      chatsCursor: null,
    });
    return isDone;
  },
  returns: v.boolean(),
});

const deleteAllArgs = {
  domainId: v.string(),
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

export const _deleteAllForDomainIdAsync = internalMutation({
  args: deleteAllArgs,
  handler: deleteAllFroDomainIdAsyncHandler,
});

async function deleteAllFroDomainIdAsyncHandler(
  ctx: MutationCtx,
  args: DeleteAllArgs
): Promise<boolean> {
  const result = await deletePageForDomainId(ctx, args);
  if (!result.isDone) {
    await ctx.scheduler.runAfter(
      0,
      internal.messages._deleteAllForDomainIdAsync,
      {
        domainId: args.domainId,
        messagesCursor: result.messagesCursor,
        chatsCursor: result.chatsCursor,
      }
    );
  }
  return result.isDone;
}

export const _deletePageForDomainId = internalMutation({
  args: deleteAllArgs,
  handler: deletePageForDomainId,
  returns: deleteAllReturns,
});
async function deletePageForDomainId(
  ctx: MutationCtx,
  args: DeleteAllArgs
): Promise<DeleteAllReturns> {
  const streams = statuses.map((status) =>
    stream(ctx.db, schema)
      .query("chats")
      .withIndex("status_domainId_order", (q) =>
        q.eq("status", status).eq("domainId", args.domainId)
      )
      .order("desc")
  );
  const chatStreams = mergedStream(streams, ["order"]);
  const messages = await chatStreams
    .flatMap(
      async (c) =>
        stream(ctx.db, schema)
          .query("messages")
          .withIndex("chatId_status_visible_visibleOrder", (q) =>
            q.eq("chatId", c._id)
          ),
      ["chatId"]
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

const vMessageDoc = schema.tables.messages.validator;
const messageStatuses = vMessageDoc.fields.status.members.map((m) => m.value);

function visibleMessagesStreamsDesc(ctx: QueryCtx, chatId: Id<"chats">) {
  return messageStatuses.map((status) =>
    stream(ctx.db, schema)
      .query("messages")
      .withIndex("chatId_status_visible_visibleOrder", (q) =>
        q.eq("chatId", chatId).eq("status", status).eq("visible", true)
      )
      .order("desc")
  );
}

function allMessagesStreamsDesc(ctx: QueryCtx, chatId: Id<"chats">) {
  return messageStatuses.map((status) =>
    stream(ctx.db, schema)
      .query("messages")
      .withIndex("status_chatId_order", (q) =>
        q.eq("status", status).eq("chatId", chatId)
      )
  );
}

export const addMessage = mutation({
  args: {
    chatId: v.id("chats"),
    message: v.optional(vMessage),
    fileId: v.optional(v.id("files")),
    visible: v.optional(v.boolean()),
    addPending: v.optional(v.boolean()),
    clearPending: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.clearPending) {
      const pendingMessages = await ctx.db
        .query("messages")
        .withIndex("status_chatId_order", (q) =>
          q.eq("status", "pending").eq("chatId", args.chatId)
        )
        .collect();
      await Promise.all(pendingMessages.map((m) => ctx.db.delete(m._id)));
    }
    const maxVisibleMessage = await mergedStream(
      visibleMessagesStreamsDesc(ctx, args.chatId),
      ["visibleOrder"]
    ).first();
    const visible = args.visible ?? true;
    const lastVisibleOrder = maxVisibleMessage?.visibleOrder ?? -1;
    const visibleOrder = visible ? lastVisibleOrder + 1 : lastVisibleOrder;

    const maxOrder = await mergedStream(
      allMessagesStreamsDesc(ctx, args.chatId),
      ["order"]
    ).first();
    const order = (maxOrder?.order ?? -1) + 1;
    const messageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      message: args.message,
      order,
      visible,
      visibleOrder,
      fileId: args.fileId,
      status: args.message ? "success" : "pending",
    });
    const message = (await ctx.db.get(messageId))!;
    if (args.addPending) {
      const pendingId = await ctx.db.insert("messages", {
        chatId: args.chatId,
        status: "pending",
        order: order + 1,
        visible,
        visibleOrder: visible ? visibleOrder + 1 : visibleOrder,
      });
      const pending = (await ctx.db.get(pendingId))!;
      return { message, pending };
    }
    return { message };
  },
  returns: v.object({
    message: v.doc("messages"),
    pending: v.optional(v.doc("messages")),
  }),
});

export const getMessages = query({
  args: {
    chatId: v.id("chats"),
    visible: v.optional(v.boolean()),
    order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    limit: v.optional(v.number()),
    // Note: the other arguments cannot change from when the cursor was created.
    cursor: v.optional(v.string()),
    offset: v.optional(v.number()),
    statuses: v.optional(v.array(vMessageStatus)),
  },
  handler: async (ctx, args) => {
    const statuses = args.statuses ?? ["success"];
    const visible = args.visible;
    const order = args.order ?? "desc";
    const streams =
      visible !== undefined
        ? statuses.map((status) =>
            stream(ctx.db, schema)
              .query("messages")
              .withIndex("chatId_status_visible_visibleOrder", (q) =>
                q
                  .eq("chatId", args.chatId)
                  .eq("status", status)
                  .eq("visible", visible)
                  .gte("visibleOrder", args.offset ?? 0)
              )
              .order(order)
          )
        : statuses.map((status) =>
            stream(ctx.db, schema)
              .query("messages")
              .withIndex("status_chatId_order", (q) =>
                q
                  .eq("status", status)
                  .eq("chatId", args.chatId)
                  .gte("order", args.offset ?? 0)
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

// export const getMessagesPage = query({
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
