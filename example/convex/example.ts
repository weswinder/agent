import { paginationOptsValidator, PaginationResult } from "convex/server";
import { WorkflowManager } from "@convex-dev/workflow";
import { Agent } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { ThreadDoc } from "../../src/client/types";

// Define an agent similarly to the AI SDK
const supportAgent = new Agent(components.agent, {
  chat: openai.chat("gpt-4o-mini"),
  textEmbedding: openai.embedding("text-embedding-3-small"),
  instructions: "You are a helpful assistant.",
});

const wordsmithAgent = new Agent(components.agent, {
  chat: openai.chat("gpt-4o-mini"),
  textEmbedding: openai.embedding("text-embedding-3-small"),
  instructions: "You output a spiffy quirky version of what the user says.",
});

// Use the agent from within a normal action:
export const createThread = action({
  args: { prompt: v.string(), userId: v.optional(v.string()) },
  handler: async (ctx, { prompt, userId }) => {
    const { threadId, thread } = await supportAgent.createThread(ctx, {
      userId,
    });
    const result = await thread.generateText({ prompt });
    return { threadId, text: result.text };
  },
});

export const continueThread = action({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, { prompt, threadId }) => {
    // This includes previous message history from the thread automatically.
    const { thread } = await supportAgent.continueThread(ctx, { threadId });
    const { text, messageId } = await thread.generateText({ prompt });
    return { text, messageId };
  },
});

// Or use it within a workflow:
export const supportAgentStep = supportAgent.asAction({ maxSteps: 10 });
export const wordsmithAgentStep = wordsmithAgent.asAction();

const workflow = new WorkflowManager(components.workflow);
const s = internal.example; // where steps are defined

export const supportAgentWorkflow = workflow.define({
  args: { prompt: v.string() },
  handler: async (step, { prompt }): Promise<string> => {
    const { threadId } = await step.runAction(s.supportAgentStep, {
      createThread: {},
    });
    const roughSuggestion = await step.runAction(s.supportAgentStep, {
      threadId,
      generateText: { prompt },
    });
    const wordsmithSuggestion = await step.runAction(s.wordsmithAgentStep, {
      generateText: { prompt: roughSuggestion },
    });
    console.log(wordsmithSuggestion);
    return wordsmithSuggestion;
  },
});

export const getThreads = query({
  args: { userId: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (
    ctx,
    { userId, paginationOpts },
  ): Promise<PaginationResult<ThreadDoc>> => {
    const results = await ctx.runQuery(
      components.agent.messages.getThreadsByUserId,
      { userId, paginationOpts },
    );
    return results;
  },
});

export const getThreadMessages = query({
  args: { threadId: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { threadId, paginationOpts }) => {
    return await ctx.runQuery(components.agent.messages.getThreadMessages, {
      threadId,
      paginationOpts,
    });
  },
});

export const getInProgressMessages = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const { page } = await ctx.runQuery(
      components.agent.messages.getThreadMessages,
      { threadId, statuses: ["pending"] },
    );
    return page;
  },
});

export const streamThread = action({
  args: { prompt: v.string() },
  handler: async (ctx, { prompt }) => {
    const { threadId, thread } = await supportAgent.createThread(ctx, {});
    const result = await thread.streamText({ prompt });
    return { threadId, text: result.text };
  },
});

export const searchMessages = action({
  args: {
    text: v.string(),
    userId: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, { text, userId, threadId }) => {
    return supportAgent.fetchContextMessages(ctx, {
      userId,
      threadId,
      messages: [{ role: "user", content: text }],
      searchOtherThreads: true,
      recentMessages: 0,
      searchOptions: {
        textSearch: true,
        vectorSearch: true,
        messageRange: { before: 0, after: 0 },
        limit: 10,
      },
    });
  },
});

export const generateObject = action({
  args: { prompt: v.string() },
  handler: async (ctx, { prompt }) => {
    const { threadId, thread } = await supportAgent.createThread(ctx, {});
    const result = await thread.streamObject({
      output: "object",
      schema: z.object({
        name: z.string(),
        age: z.number(),
      }),
      prompt,
    });
    return { threadId, object: result.object };
  },
});
