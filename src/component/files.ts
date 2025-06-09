import { paginator } from "convex-helpers/server/pagination";
import type { Id } from "./_generated/dataModel.js";
import { mutation, type MutationCtx, query } from "./_generated/server.js";
import { schema, v } from "./schema.js";

export const addFile = mutation({
  args: {
    storageId: v.string(),
    hash: v.string(),
    filename: v.optional(v.string()),
  },
  handler: addFileHandler,
  returns: {
    fileId: v.id("files"),
    storageId: v.string(),
  },
});

export async function addFileHandler(
  ctx: MutationCtx,
  args: { storageId: string; hash: string; filename: string | undefined }
) {
  const existingFile = await ctx.db
    .query("files")
    .withIndex("hash", (q) => q.eq("hash", args.hash))
    .filter((q) => q.eq(q.field("filename"), args.filename))
    .first();
  if (existingFile) {
    // increment the refcount
    await ctx.db.patch(existingFile._id, {
      refcount: existingFile.refcount + 1,
    });
    return {
      fileId: existingFile._id,
      storageId: existingFile.storageId,
    };
  }
  const fileId = await ctx.db.insert("files", {
    ...args,
    refcount: 1,
  });
  return {
    fileId,
    storageId: args.storageId,
  };
}

/**
 * If you plan to have the same file added over and over without a reference to
 * the fileId, you can use this query to get the fileId of the existing file.
 * And if it's the same file, it will increment the refcount.
 * It will only match if the filename is the same (or both are undefined).
 */
export const useExistingFile = mutation({
  args: {
    hash: v.string(),
    filename: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("files")
      .withIndex("hash", (q) => q.eq("hash", args.hash))
      .filter((q) => q.eq(q.field("filename"), args.filename))
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
