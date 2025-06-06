import { paginationOptsValidator } from "convex/server";
import { Agent, Thread } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { chat } from "../../../example/examplesModels";
import {
  action,
  ActionCtx,
  internalAction,
  mutation,
  MutationCtx,
  query,
  QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { ToolSet } from "ai";

// Define an agent similarly to the AI SDK
export const agent = new Agent(components.agent, {
  name: "Basic Agent",
  chat: chat,
  instructions:
    "You are a concise assistant who responds with emojis " +
    "and abbreviations like lmao, lol, iirc, afaik, etc. where appropriate.",
  // tools: { updateThreadTitle },
});

// Save a user message, and kick off an async response.
export const sendMessage = mutation({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, { prompt, threadId }) => {
    await authorizeThreadAccess(ctx, threadId);
    const { messageId } = await agent.saveMessage(ctx, {
      threadId,
      prompt,
    });
    await ctx.scheduler.runAfter(0, internal.chatBasic.generateResponse, {
      threadId,
      promptMessageId: messageId,
    });
  },
});

// Generate a response to a user message. This will automatically end up
// in the listThreadMessages query when it's done.
export const generateResponse = internalAction({
  args: { promptMessageId: v.string(), threadId: v.string() },
  handler: async (ctx, { promptMessageId, threadId }) => {
    const { thread } = await agent.continueThread(ctx, { threadId });
    await thread.generateText({ promptMessageId });

    await maybeUpdateThreadTitle(thread);
  },
});

/**
 * Query & subscribe to messages & threads
 */

export const listThreadMessages = query({
  args: {
    // These arguments are required:
    threadId: v.string(),
    paginationOpts: paginationOptsValidator, // Used to paginate the messages.
  },
  handler: async (ctx, args) => {
    const { threadId, paginationOpts } = args;
    await authorizeThreadAccess(ctx, threadId);
    const paginated = await agent.listMessages(ctx, {
      threadId,
      paginationOpts,
    });
    // Here you could add more fields to the messages, like the user's name.
    return paginated;
  },
});

export const createNewThread = mutation({
  args: { title: v.optional(v.string()) },
  handler: async (ctx, { title }) => {
    const userId = await getUserId(ctx);
    const { threadId } = await agent.createThread(ctx, { userId, title });
    return threadId;
  },
});

export const getThreadDetails = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const { title } = await agent.getThreadMetadata(ctx, { threadId });
    return { title };
  },
});

// If the thread doesn't have a title, generate one.
async function maybeUpdateThreadTitle(thread: Thread<ToolSet>) {
  const existingTitle = (await thread.getMetadata()).title;
  console.log("existingTitle", existingTitle);
  if (!existingTitle || existingTitle.endsWith(" thread")) {
    const { text } = await thread.generateText(
      { prompt: "Generate a title for this thread." },
      { storageOptions: { saveMessages: "none" } },
    );
    await thread.updateMetadata({ title: text });
  }
}

/**
 * ==============================
 * Functions for demo purposes.
 * In a real app, you'd use real authentication & authorization.
 * ==============================
 */

async function getUserId(_ctx: QueryCtx | MutationCtx | ActionCtx) {
  // For demo purposes. Usually you'd use auth here.
  return "storytelling user";
}

async function authorizeThreadAccess(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  threadId: string,
) {
  const userId = await getUserId(ctx);
  // For demo purposes. Usually you'd use auth here.
  if (!userId || !threadId || userId !== "storytelling user") {
    throw new Error("Unauthorized");
  }
}

/**
 * ==============================
 * Other ways of doing things:
 * ==============================
 */

// Not streaming, just used for comparison
export const generateTextInAnAction = action({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, { prompt, threadId }) => {
    await authorizeThreadAccess(ctx, threadId);
    const { thread } = await agent.continueThread(ctx, { threadId });
    const result = await thread.generateText({ prompt });
    return result.text;
  },
});
