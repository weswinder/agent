import { assert } from "convex-helpers";
import { mergedStream, stream } from "convex-helpers/server/stream";
import { ObjectType } from "convex/values";
import {
  DEFAULT_MESSAGE_RANGE,
  DEFAULT_RECENT_MESSAGES,
  extractText,
  isTool,
} from "../shared.js";
import {
  paginationResultValidator,
  vMessageEmbeddings,
  vMessageStatus,
  vMessageWithMetadata,
  vSearchOptions,
  vStepWithMessages,
} from "../validators.js";
import { api, internal } from "./_generated/api.js";
import { Doc, Id } from "./_generated/dataModel.js";
import {
  action,
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
import {
  listThreadsByUserId as _listThreadsByUserId,
  getThread as _getThread,
  updateThread as _updateThread,
} from "./threads.js";
import { paginationOptsValidator } from "convex/server";

/** @deprecated Use *.threads.listMessagesByThreadId instead. */
export const listThreadsByUserId = _listThreadsByUserId;

/** @deprecated Use *.threads.getThread */
export const getThread = _getThread;

/** @deprecated Use *.threads.updateThread instead */
export const updateThread = _updateThread;

export async function deleteMessage(
  ctx: MutationCtx,
  messageDoc: Doc<"messages">
) {
  await ctx.db.delete(messageDoc._id);
  if (messageDoc.embeddingId) {
    await ctx.db.delete(messageDoc.embeddingId);
  }
  for (const { fileId } of messageDoc.files ?? []) {
    if (!fileId) continue;
    const file = await ctx.db.get(fileId);
    if (file) {
      await ctx.db.patch(fileId, { refcount: file.refcount - 1 });
    }
  }
}

export const vMessageDoc = schema.tables.messages.validator;
export const messageStatuses = vMessageDoc.fields.status.members.map(
  (m) => m.value
);

const addMessagesArgs = {
  userId: v.optional(v.string()),
  threadId: v.id("threads"),
  stepId: v.optional(v.id("steps")),
  promptMessageId: v.optional(v.id("messages")),
  agentName: v.optional(v.string()),
  messages: v.array(vMessageWithMetadata),
  embeddings: v.optional(vMessageEmbeddings),
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
  let userId = args.userId;
  const threadId = args.threadId;
  if (!userId && args.threadId) {
    const thread = await ctx.db.get(args.threadId);
    assert(thread, `Thread ${args.threadId} not found`);
    userId = thread.userId;
  }
  const { failPendingSteps, pending, messages, promptMessageId, ...rest } =
    args;
  const parentMessage = promptMessageId && (await ctx.db.get(promptMessageId));
  if (failPendingSteps) {
    assert(args.threadId, "threadId is required to fail pending steps");
    const pendingMessages = await ctx.db
      .query("messages")
      .withIndex("threadId_status_tool_order_stepOrder", (q) =>
        q.eq("threadId", threadId).eq("status", "pending")
      )
      .collect();
    await Promise.all(
      pendingMessages
        .filter((m) => !parentMessage || m.order === parentMessage.order)
        .map((m) =>
          ctx.db.patch(m._id, { status: "failed", error: "Restarting" })
        )
    );
  }
  let order, stepOrder;
  let fail = false;
  if (promptMessageId) {
    assert(parentMessage, `Parent message ${promptMessageId} not found`);
    if (parentMessage.status === "failed") {
      fail = true;
    }
    order = parentMessage.order;
    // Defend against there being existing messages with this parent.
    const maxMessage = await getMaxMessage(ctx, threadId, order);
    stepOrder = maxMessage?.stepOrder ?? parentMessage.stepOrder;
  } else {
    const maxMessage = await getMaxMessage(ctx, threadId);
    order = maxMessage ? maxMessage.order + 1 : 0;
    stepOrder = -1;
  }
  const toReturn: Doc<"messages">[] = [];
  if (messages.length > 0) {
    if (args.embeddings) {
      assert(
        args.embeddings.vectors.length === messages.length,
        "embeddings.vectors.length must match messages.length"
      );
    }
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      let embeddingId: VectorTableId | undefined;
      if (args.embeddings && args.embeddings.vectors[i]) {
        embeddingId = await insertVector(ctx, args.embeddings.dimension, {
          vector: args.embeddings.vectors[i]!,
          model: args.embeddings.model,
          table: "messages",
          userId,
          threadId,
        });
      }
      stepOrder++;
      const messageId = await ctx.db.insert("messages", {
        ...rest,
        ...message,
        embeddingId,
        parentMessageId: promptMessageId,
        userId,
        order,
        tool: isTool(message.message),
        text: extractText(message.message),
        status: fail ? "failed" : pending ? "pending" : "success",
        error: fail ? "Parent message failed" : undefined,
        stepOrder,
      });
      if (!message.id) {
        await ctx.db.patch(messageId, {
          id: messageId,
        });
      }
      for (const { fileId } of message.files ?? []) {
        if (!fileId) continue;
        await ctx.db.patch(fileId, {
          refcount: (await ctx.db.get(fileId))!.refcount + 1,
        });
      }
      toReturn.push((await ctx.db.get(messageId))!);
    }
  }
  return { messages: toReturn };
}

// exported for tests
export async function getMaxMessage(
  ctx: QueryCtx,
  threadId: Id<"threads">,
  order?: number
) {
  return orderedMessagesStream(ctx, threadId, "desc", order).first();
}

function orderedMessagesStream(
  ctx: QueryCtx,
  threadId: Id<"threads">,
  sortOrder: "asc" | "desc",
  order?: number
) {
  return mergedStream(
    [true, false].flatMap((tool) =>
      ["success" as const, "pending" as const].map((status) =>
        stream(ctx.db, schema)
          .query("messages")
          .withIndex("threadId_status_tool_order_stepOrder", (q) => {
            const qq = q
              .eq("threadId", threadId)
              .eq("status", status)
              .eq("tool", tool);
            if (order) {
              return qq.eq("order", order);
            }
            return qq;
          })
          .order(sortOrder)
      )
    ),
    ["order", "stepOrder"]
  );
}

const addStepArgs = {
  userId: v.optional(v.string()),
  threadId: v.id("threads"),
  promptMessageId: v.id("messages"),
  step: vStepWithMessages,
  failPendingSteps: v.optional(v.boolean()),
};

export const addStep = mutation({
  args: addStepArgs,
  returns: v.array(v.doc("steps")),
  handler: addStepHandler,
});
async function addStepHandler(
  ctx: MutationCtx,
  args: ObjectType<typeof addStepArgs>
) {
  const parentMessage = await ctx.db.get(args.promptMessageId);
  assert(parentMessage, `Message ${args.promptMessageId} not found`);
  const order = parentMessage.order;
  // TODO: only fetch the last one if we aren't failing pending steps
  let steps = await ctx.db
    .query("steps")
    .withIndex("parentMessageId_order_stepOrder", (q) =>
      // TODO: fetch pending, and commit later
      q.eq("parentMessageId", args.promptMessageId)
    )
    .collect();
  if (args.failPendingSteps) {
    for (const step of steps) {
      if (step.status === "pending") {
        await ctx.db.patch(step._id, { status: "failed" });
      }
    }
    steps = steps.filter((s) => s.status !== "failed");
  }
  const { step, messages } = args.step;
  const stepId = await ctx.db.insert("steps", {
    threadId: args.threadId,
    parentMessageId: args.promptMessageId,
    order,
    stepOrder: (steps.at(-1)?.stepOrder ?? -1) + 1,
    status: step.finishReason === "stop" ? "success" : "pending",
    step,
  });
  await addMessagesHandler(ctx, {
    userId: args.userId,
    threadId: args.threadId,
    stepId,
    promptMessageId: args.promptMessageId,
    agentName: parentMessage.agentName,
    messages,
    pending: step.finishReason === "stop" ? false : true,
    failPendingSteps: false,
  });
  // We don't commit if the parent is still pending.
  if (step.finishReason === "stop") {
    await commitMessageHandler(ctx, { messageId: args.promptMessageId });
  }
  steps.push((await ctx.db.get(stepId))!);
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
    const messages = await orderedMessagesStream(
      ctx,
      message.threadId,
      "asc",
      message.order
    ).collect();
    for (const m of messages) {
      if (m.status === "pending") {
        await ctx.db.patch(m._id, { status: "failed", error });
      }
    }

    const steps = await ctx.db
      .query("steps")
      .withIndex("parentMessageId_order_stepOrder", (q) =>
        // TODO: fetch pending, and commit later
        q.eq("parentMessageId", messageId)
      )
      .collect();
    for (const step of steps) {
      if (step.status === "pending") {
        await ctx.db.patch(step._id, { status: "failed" });
      }
    }
    await ctx.db.patch(messageId, {
      status: "failed",
      error: error,
    });
  },
});

export const commitMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.null(),
  handler: commitMessageHandler,
});
async function commitMessageHandler(
  ctx: MutationCtx,
  { messageId }: { messageId: Id<"messages"> }
) {
  const message = await ctx.db.get(messageId);
  assert(message, `Message ${messageId} not found`);

  const allSteps = await ctx.db
    .query("steps")
    .withIndex("parentMessageId_order_stepOrder", (q) =>
      q.eq("parentMessageId", messageId)
    )
    .collect();
  for (const step of allSteps) {
    if (step.status === "pending") {
      await ctx.db.patch(step._id, { status: "success" });
    }
  }
  const order = message.order!;
  const messages = await mergedStream(
    [true, false].map((tool) =>
      stream(ctx.db, schema)
        .query("messages")
        .withIndex("threadId_status_tool_order_stepOrder", (q) =>
          q
            .eq("threadId", message.threadId)
            .eq("status", "pending")
            .eq("tool", tool)
            .eq("order", order)
        )
    ),
    ["order", "stepOrder"]
  ).collect();
  for (const message of messages) {
    await ctx.db.patch(message._id, { status: "success" });
  }
}

export const listMessagesByThreadId = query({
  args: {
    threadId: v.id("threads"),
    excludeToolMessages: v.optional(v.boolean()),
    /** @deprecated Use excludeToolMessages instead. */
    isTool: v.optional(v.literal("use excludeToolMessages instead of this")),
    order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    paginationOpts: v.optional(paginationOptsValidator),
    statuses: v.optional(v.array(vMessageStatus)),
    upToAndIncludingMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const statuses =
      args.statuses ?? vMessageStatus.members.map((m) => m.value);
    const last =
      args.upToAndIncludingMessageId &&
      (await ctx.db.get(args.upToAndIncludingMessageId));
    assert(
      !last || last.threadId === args.threadId,
      "upToAndIncludingMessageId must be a message in the thread"
    );
    const toolOptions = args.excludeToolMessages ? [false] : [true, false];
    const order = args.order ?? "desc";
    const streams = toolOptions.flatMap((tool) =>
      statuses.map((status) =>
        stream(ctx.db, schema)
          .query("messages")
          .withIndex("threadId_status_tool_order_stepOrder", (q) => {
            const qq = q
              .eq("threadId", args.threadId)
              .eq("status", status)
              .eq("tool", tool);
            if (last) {
              return qq.lte("order", last.order);
            }
            return qq;
          })
          .order(order)
          .filterWith(
            async (m) =>
              !last ||
              m.order < last.order ||
              (m.order === last.order && m.stepOrder <= last.stepOrder)
          )
      )
    );
    const messages = await mergedStream(streams, [
      "order",
      "stepOrder",
    ]).paginate(
      args.paginationOpts ?? {
        numItems: DEFAULT_RECENT_MESSAGES,
        cursor: null,
      }
    );
    return messages;
  },
  returns: paginationResultValidator(v.doc("messages")),
});

/** @deprecated Use listMessagesByThreadId instead. */
export const getThreadMessages = query({
  args: { deprecated: v.literal("Use listMessagesByThreadId instead") },
  handler: async () => {
    throw new Error("Use listMessagesByThreadId instead of getThreadMessages");
  },
  returns: paginationResultValidator(v.doc("messages")),
});

export const searchMessages = action({
  args: {
    userId: v.optional(v.string()),
    threadId: v.optional(v.id("threads")),
    beforeMessageId: v.optional(v.id("messages")),
    ...vSearchOptions.fields,
  },
  returns: v.array(v.doc("messages")),
  handler: async (ctx, args): Promise<Doc<"messages">[]> => {
    assert(args.userId || args.threadId, "Specify userId or threadId");
    const limit = args.limit;
    let textSearchMessages: Doc<"messages">[] | undefined;
    if (args.text) {
      textSearchMessages = await ctx.runQuery(api.messages.textSearch, {
        userId: args.userId,
        threadId: args.threadId,
        text: args.text,
        limit,
        beforeMessageId: args.beforeMessageId,
      });
    }
    if (args.vector) {
      const dimension = args.vector.length as VectorDimension;
      if (!VectorDimensions.includes(dimension)) {
        throw new Error(`Unsupported vector dimension: ${dimension}`);
      }
      const vectors = (
        await searchVectors(ctx, args.vector, {
          dimension,
          model: args.vectorModel ?? "unknown",
          table: "messages",
          userId: args.userId,
          threadId: args.threadId,
          limit,
        })
      ).filter((v) => v._score > (args.vectorScoreThreshold ?? 0));
      // Reciprocal rank fusion
      const k = 10;
      const textEmbeddingIds = textSearchMessages?.map((m) => m.embeddingId);
      const vectorScores = vectors
        .map((v, i) => ({
          id: v._id,
          score:
            1 / (i + k) +
            1 / ((textEmbeddingIds?.indexOf(v._id) ?? Infinity) + k),
        }))
        .sort((a, b) => b.score - a.score);
      const vectorIds = vectorScores.slice(0, limit).map((v) => v.id);
      const messages: Doc<"messages">[] = await ctx.runQuery(
        internal.messages._fetchSearchMessages,
        {
          userId: args.userId,
          threadId: args.threadId,
          vectorIds,
          textSearchMessages: textSearchMessages?.filter(
            (m) => !vectorIds.includes(m.embeddingId!)
          ),
          messageRange: args.messageRange ?? DEFAULT_MESSAGE_RANGE,
          beforeMessageId: args.beforeMessageId,
          limit,
        }
      );
      return messages;
    }
    return textSearchMessages?.flat() ?? [];
  },
});

export const _fetchSearchMessages = internalQuery({
  args: {
    userId: v.optional(v.string()),
    threadId: v.optional(v.id("threads")),
    vectorIds: v.array(vVectorId),
    textSearchMessages: v.optional(v.array(v.doc("messages"))),
    messageRange: v.object({ before: v.number(), after: v.number() }),
    beforeMessageId: v.optional(v.id("messages")),
    limit: v.number(),
  },
  returns: v.array(v.doc("messages")),
  handler: async (ctx, args): Promise<Doc<"messages">[]> => {
    const beforeMessage =
      args.beforeMessageId && (await ctx.db.get(args.beforeMessageId));
    const { userId, threadId } = args;
    assert(userId || threadId, "Specify userId or threadId to search");
    let messages = (
      await Promise.all(
        args.vectorIds.map((embeddingId) =>
          ctx.db
            .query("messages")
            .withIndex("embeddingId", (q) => q.eq("embeddingId", embeddingId))
            .filter((q) =>
              userId
                ? q.eq(q.field("userId"), userId)
                : q.eq(q.field("threadId"), threadId)
            )
            // Don't include pending. Failed messages hopefully are deleted but may as well be safe.
            .filter((q) => q.eq(q.field("status"), "success"))
            .first()
        )
      )
    ).filter(
      (m): m is Doc<"messages"> =>
        m !== undefined &&
        m !== null &&
        !m.tool &&
        (!beforeMessage ||
          m.order < beforeMessage.order ||
          (m.order === beforeMessage.order &&
            m.stepOrder < beforeMessage.stepOrder))
    );
    messages.push(...(args.textSearchMessages ?? []));
    // TODO: prioritize more recent messages
    messages.sort((a, b) => a.order! - b.order!);
    messages = messages.slice(0, args.limit);
    // Fetch the surrounding messages
    if (!threadId) {
      return messages.sort((a, b) => a.order - b.order);
    }
    const included: Record<string, Set<number>> = {};
    for (const m of messages) {
      const searchId = m.threadId ?? m.userId!;
      if (!included[searchId]) {
        included[searchId] = new Set();
      }
      included[searchId].add(m.order!);
    }
    const ranges: Record<string, Doc<"messages">[]> = {};
    const { before, after } = args.messageRange;
    for (const m of messages) {
      const searchId = m.threadId ?? m.userId!;
      const order = m.order!;
      let earliest = order - before;
      let latest = order + after;
      for (; earliest <= latest; earliest++) {
        if (!included[searchId].has(earliest)) {
          break;
        }
      }
      for (; latest >= earliest; latest--) {
        if (!included[searchId].has(latest)) {
          break;
        }
      }
      for (let i = earliest; i <= latest; i++) {
        included[searchId].add(i);
      }
      if (earliest !== latest) {
        const surrounding = await ctx.db
          .query("messages")
          .withIndex("threadId_status_tool_order_stepOrder", (q) =>
            q
              .eq("threadId", m.threadId as Id<"threads">)
              .eq("status", "success")
              .eq("tool", false)
              .gte("order", earliest)
              .lte("order", latest)
          )
          .collect();
        if (!ranges[searchId]) {
          ranges[searchId] = [];
        }
        ranges[searchId].push(...surrounding);
      }
    }
    for (const r of Object.values(ranges).flat()) {
      if (!messages.some((m) => m._id === r._id)) {
        messages.push(r);
      }
    }
    return messages.sort((a, b) => a.order - b.order);
  },
});

// returns ranges of messages in order of text search relevance,
// excluding duplicates in later ranges.
export const textSearch = query({
  args: {
    threadId: v.optional(v.id("threads")),
    userId: v.optional(v.string()),
    text: v.string(),
    limit: v.number(),
    beforeMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    assert(args.userId || args.threadId, "Specify userId or threadId");
    const beforeMessage =
      args.beforeMessageId && (await ctx.db.get(args.beforeMessageId));
    const order = beforeMessage?.order;
    const messages = await ctx.db
      .query("messages")
      .withSearchIndex("text_search", (q) =>
        args.userId
          ? q.search("text", args.text).eq("userId", args.userId)
          : q.search("text", args.text).eq("threadId", args.threadId!)
      )
      // Just in case tool messages slip through
      .filter((q) => {
        const qq = q.eq(q.field("tool"), false);
        if (order) {
          return q.and(qq, q.lte(q.field("order"), order));
        }
        return qq;
      })
      .take(args.limit);
    return messages.filter(
      (m) =>
        !beforeMessage ||
        m.order < beforeMessage.order ||
        (m.order === beforeMessage.order &&
          m.stepOrder < beforeMessage.stepOrder)
    );
  },
  returns: v.array(v.doc("messages")),
});
