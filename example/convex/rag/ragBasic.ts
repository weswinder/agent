import {
  query,
  action,
  mutation,
  internalAction,
  internalMutation,
} from "../_generated/server";
import { components, internal } from "../_generated/api";
import { Memory, vEntry, vEntryId, vSearchResult } from "@convex-dev/memory";
import { openai } from "@ai-sdk/openai";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Agent } from "@convex-dev/agent";

const memory = new Memory(components.memory, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});

const agent = new Agent(components.agent, {
  chat: openai.chat("gpt-4o-mini"),
  instructions: `You are a helpful assistant.`,
});

export const addKnowledge = action({
  args: {
    key: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
    });
    const chunks = await textSplitter.splitText(args.text);
    await memory.add(ctx, {
      namespace: "global", // Could set a per-user namespace here
      chunks,
      key: args.key,
    });
  },
});

export const sendMessage = mutation({
  args: {
    threadId: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    let threadId = args.threadId;
    if (!threadId) {
      ({ threadId } = await agent.createThread(ctx));
    }
    const { messageId } = await agent.saveMessage(ctx, {
      threadId,
      message: { role: "user", content: args.message },
    });
    await ctx.scheduler.runAfter(0, internal.rag.ragBasic.generateTextAsync, {
      threadId,
      query: args.message,
      messageId,
    });
    return threadId;
  },
});

export const generateTextAsync = internalAction({
  args: {
    threadId: v.string(),
    query: v.string(),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    const { thread } = await agent.continueThread(ctx, {
      threadId: args.threadId,
    });
    const context = await memory.search(ctx, {
      namespace: "global",
      query: args.query,
      limit: 5,
      chunkContext: { before: 1, after: 1 },
    });
    await ctx.runMutation(internal.rag.ragBasic.recordContextUsed, {
      messageId: args.messageId,
      entries: context.entries,
      results: context.results,
    });
    await thread.generateText({
      messages: [
        {
          role: "user",
          content: `Here is some context:\n\n ${context.text.join("\n---\n")}`,
        },
      ],
      promptMessageId: args.messageId,
    });
  },
});

export const listMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return agent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });
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
