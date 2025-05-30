import { paginationOptsValidator } from "convex/server";
import { Agent, vStreamArgs } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import {
  action,
  ActionCtx,
  mutation,
  MutationCtx,
  query,
  QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { tool } from "ai";

// Define an agent similarly to the AI SDK
export const storyAgent = new Agent(components.agent, {
  name: "Story Agent",
  chat: openai.chat("gpt-4o-mini"),
  instructions: "You tell stories with twist endings. ~ 200 words.",
  tools: {
    makeUpName: tool({
      description: "Make up a name for a user",
      parameters: z.object({
        currentNames: z
          .array(z.string())
          .describe("The names of the users that have been mentioned so far"),
      }),
      execute: async ({ currentNames }) => {
        const names = ["John", "Jane", "Jim", "Jill", "Jack"].filter(
          (name) => !currentNames.includes(name),
        );
        if (names.length === 0) {
          return { name: "another person" };
        }
        const name = names[Math.floor(Math.random() * names.length)];
        return { name };
      },
    }),
  },
  maxSteps: 10,
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
    await ctx.scheduler.runAfter(
      0,
      internal.streaming.streamStoryInternalAction,
      { threadId, promptMessageId: messageId },
    );
  },
});

// Expose an internal action that streams text
export const streamStoryInternalAction = storyAgent.asTextAction({
  stream: { chunking: "word", throttleMs: 100 },
  // saveStreamDeltas: { chunking: "word", throttleMs: 100 },
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
    console.log("post streamText");
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

/**
 * Query & subscribe to messages & threads
 */

export const listThreadMessages = query({
  args: {
    // These arguments are required:
    threadId: v.string(),

    // This is used to paginate the messages.
    paginationOpts: paginationOptsValidator,

    // Because this takes in streamArgs: vStreamArgs and returns stream data,
    // this can be used to stream messages.
    streamArgs: vStreamArgs,

    // But you could pass other arguments too:
    // foo: v.number(),
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

// This fetches full messages. Streamed messages are not included.
// export const listRecentMessages = query({
//   args: { threadId: v.string() },
//   handler: async (ctx, { threadId }) => {
//     await authorizeThreadAccess(ctx, threadId);
//     const { page: messages } = await storyAgent.listMessages(ctx, {
//       threadId,
//       order: "desc",
//       take: 10,
//     });
//     // Return them in ascending order (oldest first)
//     return messages.reverse();
//   },
// });

export const createThread = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const { threadId } = await storyAgent.createThread(ctx, { userId });
    return threadId;
  },
});

/**
 * Functions for demo purposes.
 * In a real app, you'd use real authentication & authorization.
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
