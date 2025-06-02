import { paginator } from "convex-helpers/server/pagination";
import type { Id } from "./_generated/dataModel.js";
import { mutation, type MutationCtx, query } from "./_generated/server.js";
import { schema, v } from "./schema.js";

export const addFile = mutation({
  args: {
    storageId: v.string(),
    hash: v.string(),
  },
  handler: addFileHandler,
  returns: {
    fileId: v.id("files"),
    storageIdUnused: v.boolean(),
  },
});

export async function addFileHandler(
  ctx: MutationCtx,
  args: { storageId: string; hash: string }
) {
  const existingFile = await ctx.db
    .query("files")
    .withIndex("hash", (q) => q.eq("hash", args.hash))
    .first();
  if (existingFile) {
    // increment the refcount
    await ctx.db.patch(existingFile._id, {
      refcount: existingFile.refcount + 1,
    });
    return {
      fileId: existingFile._id,
      storageIdUnused: existingFile.storageId !== args.storageId,
    };
  }
  const fileId = await ctx.db.insert("files", {
    storageId: args.storageId,
    hash: args.hash,
    refcount: 1,
  });
  return {
    fileId,
    storageIdUnused: false,
  };
}

/**
 * If you plan to have the same file added over and over without a reference to
 * the fileId, you can use this query to get the fileId of the existing file.
 * And if it's
 */
export const useExistingFile = mutation({
  args: {
    hash: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("files")
      .withIndex("hash", (q) => q.eq("hash", args.hash))
      .first();
    if (!file) {
      return null;
    }
    await ctx.db.patch(file._id, {
      refcount: file.refcount + 1,
    });
    return file._id;
  },
  returns: v.union(v.id("files"), v.null()),
});

export const copyFile = mutation({
  args: {
    fileId: v.id("files"),
  },
  handler: copyFileHandler,
  returns: v.null(),
});

export async function copyFileHandler(
  ctx: MutationCtx,
  args: { fileId: Id<"files"> }
) {
  const file = await ctx.db.get(args.fileId);
  if (!file) {
    throw new Error("File not found");
  }
  await ctx.db.patch(args.fileId, {
    refcount: file.refcount + 1,
  });
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
