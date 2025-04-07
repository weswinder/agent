import { paginator } from "convex-helpers/server/pagination";
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getVectorTableName, vVectorDimension, vVectorId } from "./tables";
import schema from "../schema";
import { mergedStream } from "convex-helpers/server/stream";
import { stream } from "convex-helpers/server/stream";

export const paginate = query({
  args: {
    vectorDimension: vVectorDimension,
    targetModel: v.string(),
    cursor: v.optional(v.string()),
    limit: v.number(),
  },
  returns: v.object({
    ids: v.array(vVectorId),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const tableName = getVectorTableName(args.vectorDimension);
    const vectors = await paginator(ctx.db, schema)
      .query(tableName)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("model_kind_chatId" as any, (q) =>
        q.eq("model", args.targetModel)
      )
      .paginate({
        cursor: args.cursor ?? null,
        numItems: args.limit,
        maximumRowsRead: 300,
      });
    return {
      ids: vectors.page.map((v) => v._id),
      isDone: vectors.isDone,
      continueCursor: vectors.continueCursor,
    };
  },
});

export const deleteBatchForChat = mutation({
  args: {
    vectorDimension: vVectorDimension,
    model: v.string(),
    chatId: v.string(),
    cursor: v.optional(v.string()),
    limit: v.number(),
  },
  returns: v.object({
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const tableName = getVectorTableName(args.vectorDimension);
    const vectors = await mergedStream(
      ["chat", "memory"].map((kind) =>
        stream(ctx.db, schema)
          .query(tableName)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .withIndex("model_kind_chatId" as any, (q) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (q.eq("model", args.model) as any)
              .eq("kind", kind)
              .eq("chatId", args.chatId)
          )
      ),
      ["chatId"]
    ).paginate({
      cursor: args.cursor ?? null,
      numItems: args.limit,
      maximumRowsRead: 300,
    });
    await Promise.all(vectors.page.map((v) => ctx.db.delete(v._id)));
    return {
      isDone: vectors.isDone,
      continueCursor: vectors.continueCursor,
    };
  },
});

export const insertBatch = mutation({
  args: {
    vectorDimension: vVectorDimension,
    vectors: v.array(
      v.object({
        model: v.string(),
        kind: v.union(v.literal("chat"), v.literal("memory")),
        userId: v.optional(v.string()),
        chatId: v.optional(v.string()),
        vector: v.array(v.number()),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await Promise.all(
      args.vectors.map((v) =>
        ctx.db.insert(getVectorTableName(args.vectorDimension), {
          model: v.model,
          kind: v.kind,
          userId: v.userId,
          chatId: v.chatId,
          vector: v.vector,
          model_kind_userId: v.userId ? [v.model, v.kind, v.userId] : undefined,
          model_kind_chatId: v.chatId ? [v.model, v.kind, v.chatId] : undefined,
        })
      )
    );
  },
});

export const updateBatch = mutation({
  args: {
    vectors: v.array(
      v.object({
        model: v.string(),
        id: vVectorId,
        vector: v.array(v.number()),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await Promise.all(
      args.vectors.map((v) =>
        ctx.db.patch(v.id, {
          model: v.model,
          vector: v.vector,
        })
      )
    );
  },
});

export const deleteBatch = mutation({
  args: {
    ids: v.array(vVectorId),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await Promise.all(args.ids.map((id) => ctx.db.delete(id)));
  },
});
