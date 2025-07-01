import { openai } from "@ai-sdk/openai";
import { Agent, createTool } from "@convex-dev/agent";
import { Memory, vEntry, vEntryId, vSearchResult } from "@convex-dev/memory";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { z } from "zod";
import { components, internal } from "../_generated/api";
import {
  action,
  ActionCtx,
  internalMutation,
  query,
  QueryCtx,
} from "../_generated/server";

const memory = new Memory(components.memory, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});

const agent = new Agent(components.agent, {
  chat: openai.chat("gpt-4o-mini"),
  instructions: `You are a helpful assistant.`,
});

export const addMemory = action({
  args: { title: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
    });
    const chunks = await textSplitter.splitText(args.text);
    await memory.add(ctx, {
      namespace: "global", // Could set a per-user namespace here
      title: args.title,
      chunks,
    });
  },
});

export const sendMessageWithRAG = action({
  args: {
    threadId: v.optional(v.string()),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    let thread;
    if (args.threadId) {
      ({ thread } = await agent.continueThread(ctx, {
        threadId: args.threadId,
      }));
    } else {
      ({ thread } = await agent.createThread(ctx));
    }
    const context = await memory.search(ctx, {
      namespace: "global",
      query: args.prompt,
      limit: 5,
    });
    const { messageId } = await thread.generateText({
      messages: [
        {
          role: "user",
          content: `Here is some context:\n\n ${context.text}`,
        },
      ],
      prompt: args.prompt,
    });
    // To show the context in the demo UI, we record the context used
    await ctx.runMutation(internal.rag.ragBasic.recordContextUsed, {
      messageId,
      entries: context.entries,
      results: context.results,
    });
  },
});

export const sendMessageWithTools = action({
  args: {
    threadId: v.optional(v.string()),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    let thread;
    if (args.threadId) {
      ({ thread } = await agent.continueThread(ctx, {
        threadId: args.threadId,
      }));
    } else {
      ({ thread } = await agent.createThread(ctx));
    }
    const { messageId } = await thread.generateText({
      prompt: args.prompt,
      tools: {
        createMemory: createTool({
          description: "Create a new memory",
          args: z.object({
            title: z.string().describe("The title of the memory"),
            text: z.string().describe("The text of the memory"),
          }),
          handler: async (ctx, args) => {
            await memory.add(ctx, {
              namespace: userId,
              title: args.title,
              chunks: args.text.split("\n\n"),
            });
          },
        }),
        searchMemories: createTool({
          description: "Search for memories",
          args: z.object({
            query: z
              .string()
              .describe("Describe the memory you're looking for"),
          }),
          handler: async (ctx, args) => {
            const context = await memory.search(ctx, {
              namespace: userId,
              query: args.query,
              limit: 5,
            });
            // To show the context in the demo UI, we record the context used
            await ctx.runMutation(internal.rag.ragBasic.recordContextUsed, {
              messageId,
              entries: context.entries,
              results: context.results,
            });
            return (
              `Found results in ${context.entries
                .map((e) => e.title || null)
                .filter((t) => t !== null)
                .join(", ")}` + `Here is the context:\n\n ${context.text}`
            );
          },
        }),
      },
    });
  },
});

export const listMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const results = await agent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });
    return {
      ...results,
      page: await Promise.all(
        results.page.map(async (message) => ({
          ...message,
          contextUsed: await ctx.db
            .query("contextUsed")
            .withIndex("messageId", (q) => q.eq("messageId", message._id))
            .first(),
        })),
      ),
    };
  },
});

export const listKnowledge = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const namespace = await memory.getNamespace(ctx, {
      namespace: "global",
    });
    if (!namespace) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    const results = await memory.list(ctx, {
      namespaceId: namespace.namespaceId,
      paginationOpts: args.paginationOpts,
    });
    return results;
  },
});

export const listChunks = query({
  args: {
    entryId: vEntryId,
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const paginatedChunks = await memory.listChunks(ctx, {
      entryId: args.entryId,
      paginationOpts: args.paginationOpts,
    });
    return paginatedChunks;
  },
});

export const recordContextUsed = internalMutation({
  args: {
    messageId: v.string(),
    entries: v.array(vEntry),
    results: v.array(vSearchResult),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("contextUsed", args);
  },
});

/**
 * Demo functions: in a real app you'd have auth
 */

async function getUserId(_ctx: QueryCtx | ActionCtx) {
  return "Memory test user";
}
