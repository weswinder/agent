import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { paginationOptsValidator } from "convex/server";

export const createIdea = mutation({
  args: {
    title: v.string(),
    summary: v.string(),
    tags: v.array(v.string()),
    entryId: v.optional(v.id("entries")),
  },
  handler: async (ctx, args) => {
    const ideaId = await ctx.db.insert("ideas", {
      title: args.title,
      summary: args.summary,
      lastUpdated: Date.now(),
    });

    if (args.entryId) {
      await ctx.db.patch(args.entryId, { ideaId });
    }

    for (const tag of args.tags) {
      await ctx.db.insert("ideaTags", {
        ideaId,
        tag,
      });
    }

    return ideaId;
  },
});

export const searchIdeas = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const ideasByTitle = await ctx.db
      .query("ideas")
      .withSearchIndex("title", (q) =>
        q.search("title", args.query).eq("mergedInto", undefined),
      )
      .take(10);

    const ideasBySummary = await ctx.db
      .query("ideas")
      .withSearchIndex("summary", (q) =>
        q.search("summary", args.query).eq("mergedInto", undefined),
      )
      .take(10);

    return [
      ...ideasByTitle,
      ...ideasBySummary.filter(
        (i) => !ideasByTitle.find((t) => t._id === i._id),
      ),
    ];
  },
});

export const updateIdea = mutation({
  args: {
    id: v.id("ideas"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const patch: Partial<Doc<"ideas">> = {
      lastUpdated: Date.now(),
    };
    if (args.title) {
      patch.title = args.title;
    }
    if (args.summary) {
      patch.summary = args.summary;
    }
    await ctx.db.patch(args.id, patch);

    if (args.tags) {
      const existingTags = await ctx.db
        .query("ideaTags")
        .withIndex("by_ideaId", (q) => q.eq("ideaId", args.id))
        .collect();

      for (const tag of existingTags) {
        await ctx.db.delete(tag._id);
      }

      for (const tag of args.tags) {
        await ctx.db.insert("ideaTags", {
          ideaId: args.id,
          tag,
        });
      }
    }
  },
});

export const mergeIdeas = mutation({
  args: {
    sourceId: v.id("ideas"),
    targetId: v.id("ideas"),
    newTargetTitle: v.optional(v.string()),
    newTargetSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sourceId, {
      mergedInto: args.targetId,
      lastUpdated: Date.now(),
    });

    if (args.newTargetTitle) {
      await ctx.db.patch(args.targetId, {
        title: args.newTargetTitle,
      });
    }

    if (args.newTargetSummary) {
      await ctx.db.patch(args.targetId, {
        summary: args.newTargetSummary,
      });
    }

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_ideaId", (q) => q.eq("ideaId", args.sourceId))
      .collect();

    for (const entry of entries) {
      await ctx.db.patch(entry._id, { ideaId: args.targetId });
    }
  },
});

export const listIdeas = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_lastUpdated")
      .order("desc")
      .paginate(args.paginationOpts);

    const ideasWithTags = await Promise.all(
      ideas.page.map(async (idea) => {
        const tags = await ctx.db
          .query("ideaTags")
          .withIndex("by_ideaId", (q) => q.eq("ideaId", idea._id))
          .collect();
        return {
          ...idea,
          tags: tags.map((t) => t.tag),
        };
      }),
    );

    return {
      ...ideas,
      page: ideasWithTags,
    };
  },
});

export const getIdea = query({
  args: { id: v.id("ideas") },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.id);
    if (!idea) return null;

    const tags = await ctx.db
      .query("ideaTags")
      .withIndex("by_ideaId", (q) => q.eq("ideaId", args.id))
      .collect();

    const related = await ctx.db
      .query("relatedIdeas")
      .withIndex("by_idea1", (q) => q.eq("ideaId1", args.id))
      .collect();

    const relatedIdeas = await Promise.all(
      related.map(async (rel) => await ctx.db.get(rel.ideaId2)),
    );

    return {
      ...idea,
      tags: tags.map((t) => t.tag),
      related: relatedIdeas.filter(
        (i): i is NonNullable<typeof i> => i !== null,
      ),
    };
  },
});

export const createEntry = mutation({
  args: {
    content: v.string(),
    ideaId: v.optional(v.id("ideas")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("entries", args);
  },
});

export const listEntries = query({
  args: {
    ideaId: v.optional(v.id("ideas")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const query = args.ideaId
      ? ctx.db
          .query("entries")
          .withIndex("by_ideaId", (q) => q.eq("ideaId", args.ideaId))
      : ctx.db.query("entries");

    return await query.order("desc").paginate(args.paginationOpts);
  },
});
