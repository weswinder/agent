import { paginator } from "convex-helpers/server/pagination";
import { nullable } from "convex-helpers/validators";
import { ObjectType } from "convex/values";
import { internal } from "./_generated/api.js";
import {
  action,
  internalMutation,
  mutation,
  MutationCtx,
  query,
} from "./_generated/server.js";
import { schema, v } from "./schema.js";
import { deleteMessage } from "./messages.js";
import { paginationOptsValidator } from "convex/server";
import { stream } from "convex-helpers/server/stream";
import { vPaginationResult } from "../validators.js";
import { Id } from "./_generated/dataModel.js";

// Note: it only searches for users with threads
export const listUsersWithThreads = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const results = await stream(ctx.db, schema)
      .query("threads")
      .withIndex("userId", (q) => q)
      .filterWith(async (q) => !!q.userId)
      .distinct(["userId"])
      .paginate(args.paginationOpts);
    return {
      ...results,
      page: results.page.map((t) => t.userId).filter((t): t is string => !!t),
    };
  },
  returns: vPaginationResult(v.string()),
});

export const deleteAllForUserId = action({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    let threadsCursor = null;
    let threadInProgress = null;
    let messagesCursor = null;
    let isDone = false;
    while (!isDone) {
      ({ messagesCursor, threadInProgress, threadsCursor, isDone } =
        await ctx.runMutation(internal.users._deletePageForUserId, {
          userId: args.userId,
          messagesCursor,
          threadInProgress,
          threadsCursor,
        }));
    }
  },
  returns: v.null(),
});

export const deleteAllForUserIdAsync = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const isDone = await deleteAllForUserIdAsyncHandler(ctx, {
      userId: args.userId,
      messagesCursor: null,
      threadsCursor: null,
      threadInProgress: null,
    });
    return isDone;
  },
  returns: v.boolean(),
});

const deleteAllArgs = {
  userId: v.string(),
  messagesCursor: nullable(v.string()),
  threadsCursor: nullable(v.string()),
  threadInProgress: nullable(v.id("threads")),
};
type DeleteAllArgs = ObjectType<typeof deleteAllArgs>;
const deleteAllReturns = {
  threadsCursor: v.string(),
  threadInProgress: nullable(v.id("threads")),
  messagesCursor: nullable(v.string()),
  isDone: v.boolean(),
};
type DeleteAllReturns = ObjectType<typeof deleteAllReturns>;

export const _deleteAllForUserIdAsync = internalMutation({
  args: deleteAllArgs,
  handler: deleteAllForUserIdAsyncHandler,
  returns: v.boolean(),
});

async function deleteAllForUserIdAsyncHandler(
  ctx: MutationCtx,
  args: DeleteAllArgs
): Promise<boolean> {
  const result = await deletePageForUserId(ctx, args);
  if (!result.isDone) {
    await ctx.scheduler.runAfter(0, internal.users._deleteAllForUserIdAsync, {
      userId: args.userId,
      ...result,
    });
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
  let threadInProgress: Id<"threads"> | null = args.threadInProgress;
  let threadsCursor: string | null = args.threadsCursor;
  let messagesCursor: string | null = args.messagesCursor;
  if (!threadsCursor || !threadInProgress) {
    const threads = await paginator(ctx.db, schema)
      .query("threads")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .paginate({
        numItems: 1,
        cursor: args.threadsCursor ?? null,
      });
    threadsCursor = threads.continueCursor;
    if (threads.page.length > 0) {
      threadInProgress = threads.page[0]._id;
      messagesCursor = null;
    } else {
      return {
        isDone: true,
        threadsCursor,
        threadInProgress,
        messagesCursor,
      };
    }
  }
  // TODO: make a stream of thread queries and delete those in pages
  // then get rid of the "userId" index.
  const messages = await paginator(ctx.db, schema)
    .query("messages")
    .withIndex("threadId_status_tool_order_stepOrder", (q) =>
      q.eq("threadId", threadInProgress!)
    )
    .order("desc")
    .paginate({
      numItems: 100,
      cursor: args.messagesCursor,
    });
  await Promise.all(messages.page.map((m) => deleteMessage(ctx, m)));
  if (messages.isDone) {
    await ctx.db.delete(threadInProgress);
    threadInProgress = null;
    messagesCursor = null;
  } else {
    messagesCursor = messages.continueCursor;
  }
  return {
    messagesCursor,
    threadsCursor,
    threadInProgress,
    isDone: false,
  };
}
