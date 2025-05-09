import { assert, omit, pick } from "convex-helpers";
import { paginator } from "convex-helpers/server/pagination";
import { mergedStream, stream } from "convex-helpers/server/stream";
import { nullable, partial } from "convex-helpers/validators";
import { ObjectType } from "convex/values";
import {
  DEFAULT_MESSAGE_RANGE,
  DEFAULT_RECENT_MESSAGES,
  extractText,
  isTool,
} from "../shared.js";
import {
  paginationResultValidator,
  vMessageStatus,
  vMessageWithMetadata,
  vSearchOptions,
  vStepWithMessages,
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
import { insertVector, searchVectors } from "./vector/index.js";
import {
  VectorDimension,
  VectorDimensions,
  VectorTableId,
  vVectorId,
} from "./vector/tables.js";
import { paginationOptsValidator } from "convex/server";
import { deleteMessage } from "./messages.js";
import { ThreadDoc, vThreadDoc } from "../client/index.js";

function publicThreadOrNull(thread: Doc<"threads"> | null): ThreadDoc | null {
  if (thread === null) {
    return null;
  }
  return publicThread(thread);
}

function publicThread(thread: Doc<"threads">): ThreadDoc {
  return omit(thread, ["defaultSystemPrompt", "parentThreadIds", "order"]);
}

export const getThread = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    return publicThreadOrNull(await ctx.db.get(args.threadId));
  },
  returns: v.union(vThreadDoc, v.null()),
});

export const getThreadsByUserId = query({
  args: {
    userId: v.string(),
    order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    const threads = await paginator(ctx.db, schema)
      .query("threads")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .order(args.order ?? "desc")
      .paginate(args.paginationOpts ?? { cursor: null, numItems: 100 });
    return {
      ...threads,
      page: threads.page.map(publicThread),
    };
  },
  returns: paginationResultValidator(vThreadDoc),
});

const vThread = schema.tables.threads.validator;

export const createThread = mutation({
  args: omit(vThread.fields, ["order", "status"]),
  handler: async (ctx, args) => {
    const threadId = await ctx.db.insert("threads", {
      ...args,
      status: "active",
    });
    return publicThread((await ctx.db.get(threadId))!);
  },
  returns: vThreadDoc,
});

export const updateThread = mutation({
  args: {
    threadId: v.id("threads"),
    patch: v.object(
      partial(pick(vThread.fields, ["title", "summary", "status"]))
    ),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    assert(thread, `Thread ${args.threadId} not found`);
    await ctx.db.patch(args.threadId, args.patch);
    return publicThread((await ctx.db.get(args.threadId))!);
  },
  returns: vThreadDoc,
});

// When we expose this, we need to also hide all the messages and steps
// export const archiveThread = mutation({
//   args: { threadId: v.id("threads") },
//   handler: async (ctx, args) => {
//     const thread = await ctx.db.get(args.threadId);
//     assert(thread, `Thread ${args.threadId} not found`);
//     await ctx.db.patch(args.threadId, { status: "archived" });
//     return publicThread((await ctx.db.get(args.threadId))!);
//   },
//   returns: vThreadDoc,
// });

// TODO: delete thread

const deleteThreadArgs = {
  threadId: v.id("threads"),
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
};
type DeleteThreadArgs = ObjectType<typeof deleteThreadArgs>;
const deleteThreadReturns = {
  cursor: v.string(),
  isDone: v.boolean(),
};
type DeleteThreadReturns = ObjectType<typeof deleteThreadReturns>;

export const deleteAllForThreadIdSync = action({
  args: deleteThreadArgs,
  handler: async (ctx, args) => {
    const result: DeleteThreadReturns = await ctx.runMutation(
      internal.threads._deletePageForThreadId,
      { threadId: args.threadId, cursor: args.cursor, limit: args.limit }
    );
    return result;
  },
  returns: deleteThreadReturns,
});

export const deleteAllForThreadIdAsync = mutation({
  args: deleteThreadArgs,
  handler: async (ctx, args) => {
    const result = await deletePageForThreadIdHandler(ctx, args);
    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, api.threads.deleteAllForThreadIdAsync, {
        threadId: args.threadId,
        cursor: result.cursor,
      });
    }
    return result;
  },
  returns: deleteThreadReturns,
});

export const _deletePageForThreadId = internalMutation({
  args: deleteThreadArgs,
  handler: deletePageForThreadIdHandler,
  returns: deleteThreadReturns,
});

async function deletePageForThreadIdHandler(
  ctx: MutationCtx,
  args: DeleteThreadArgs
): Promise<DeleteThreadReturns> {
  const messages = await paginator(ctx.db, schema)
    .query("messages")
    .withIndex("threadId_status_tool_order_stepOrder", (q) =>
      q.eq("threadId", args.threadId)
    )
    .paginate({
      numItems: args.limit ?? 100,
      cursor: args.cursor ?? null,
    });
  await Promise.all(messages.page.map((m) => deleteMessage(ctx, m)));
  await ctx.db.delete(args.threadId);
  return {
    cursor: messages.continueCursor,
    isDone: messages.isDone,
  };
}
