import { paginationOptsValidator } from "convex/server";
import { Agent, vStreamArgs } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
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

// Define an agent similarly to the AI SDK
export const storyAgent = new Agent(components.agent, {
  name: "Story Agent",
  chat: openai.chat("gpt-4o-mini"),
  instructions: "You tell stories with twist endings. ~ 200 words.",
});

// Streaming, where generate the prompt message first, then asynchronously
// generate the stream response.
export const streamStoryAsynchronously = mutation({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, { prompt, threadId }) => {
    await authorizeThreadAccess(ctx, threadId);
    const { messageId } = await storyAgent.saveMessage(ctx, {
      threadId,
      prompt,
    });
    await ctx.scheduler.runAfter(0, internal.streaming.streamStory, {
      threadId,
      promptMessageId: messageId,
    });
  },
});

export const streamStory = internalAction({
  args: { promptMessageId: v.string(), threadId: v.string() },
  handler: async (ctx, { promptMessageId, threadId }) => {
    const { thread } = await storyAgent.continueThread(ctx, { threadId });
    await thread.streamText({ promptMessageId }, { saveStreamDeltas: true });
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
    streamArgs: vStreamArgs, // Used to stream messages.
  },
  handler: async (ctx, args) => {
    const { threadId, paginationOpts, streamArgs } = args;
    await authorizeThreadAccess(ctx, threadId);
    const streams = await storyAgent.syncStreams(ctx, { threadId, streamArgs });
    // Here you could filter out / modify the stream of deltas / filter out
    // deltas.

    const paginated = await storyAgent.listMessages(ctx, {
      threadId,
      paginationOpts,
    });
    // Here you could filter out metadata that you don't want from any optional
    // fields on the messages.
    // You can also join data onto the messages. They need only extend the
    // MessageDoc type.
    // { ...messages, page: messages.page.map(...)}

    return {
      ...paginated,
      streams,

      // ... you can return other metadata here too.
      // note: this function will be called with various permutations of delta
      // and message args, so returning derived data .
    };
  },
});

export const createThread = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const { threadId } = await storyAgent.createThread(ctx, { userId });
    return threadId;
  },
});

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

// Expose an internal action that streams text, to avoid the boilerplate of
// streamStory above.
export const streamStoryInternalAction = storyAgent.asTextAction({
  stream: true,
  // stream: { chunking: "line", throttleMs: 500 },
});

// This fetches full messages. Streamed messages are not included.
export const listRecentMessages = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    await authorizeThreadAccess(ctx, threadId);
    const { page: messages } = await storyAgent.listMessages(ctx, {
      threadId,
      paginationOpts: {
        cursor: null,
        numItems: 10,
      },
    });
    // Return them in ascending order (oldest first)
    return messages.reverse();
  },
});

// Streaming, but the action doesn't return until the streaming is done.
export const streamStorySynchronously = action({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, { prompt, threadId }) => {
    await authorizeThreadAccess(ctx, threadId);
    const { thread } = await storyAgent.continueThread(ctx, { threadId });
    const result = await thread.streamText(
      { prompt },
      { saveStreamDeltas: { chunking: "line", throttleMs: 1000 } },
    );
    for await (const chunk of result.textStream) {
      console.log(chunk);
    }
    return result.text;
  },
});

// Not streaming, just used for comparison
export const generateStoryWithoutStreaming = action({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, { prompt, threadId }) => {
    await authorizeThreadAccess(ctx, threadId);
    const { thread } = await storyAgent.continueThread(ctx, { threadId });
    const result = await thread.generateText({ prompt });
    return result.text;
  },
});
