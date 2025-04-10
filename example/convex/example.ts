import { paginationOptsValidator, PaginationResult } from "convex/server";
import { WorkflowManager } from "@convex-dev/workflow";
import { Agent, createTool } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { action, httpAction, query } from "./_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { ThreadDoc } from "../../src/client/types";
import { getGeocoding, getWeather } from "./weather";

// Define an agent similarly to the AI SDK
const weatherAgent = new Agent(components.agent, {
  chat: openai.chat("gpt-4o-mini"),
  textEmbedding: openai.embedding("text-embedding-3-small"),
  instructions:
    "You describe the weather for a location as if you were a TV weather reporter.",
  tools: {
    getWeather,
    getGeocoding,
  },
});

const fashionAgent = new Agent(components.agent, {
  chat: openai.chat("gpt-4o-mini"),
  textEmbedding: openai.embedding("text-embedding-3-small"),
  instructions:
    "You give fashion advice for a place a user is visiting, based on the weather.",
  tools: {
    getUserPreferences: createTool({
      description: "Get clothing preferences for a user",
      args: v.object({
        search: v.string(),
      }),
      handler: async (ctx, args) => {
        return {
          userId: ctx.userId,
          threadId: ctx.threadId,
          search: args.search,
          information: `The user likes to look stylish`,
        };
      },
    }),
  },
});

// Use the agent from within a normal action:
export const createThread = action({
  args: { location: v.string(), userId: v.optional(v.string()) },
  handler: async (ctx, { location, userId }) => {
    const { threadId, thread } = await weatherAgent.createThread(ctx, {
      userId,
    });
    const result = await thread.generateText({
      prompt: `What is the weather in ${location}?`,
    });
    return { threadId, text: result.text };
  },
});

export const continueThread = action({
  args: { location: v.string(), threadId: v.string() },
  handler: async (ctx, { location, threadId }) => {
    // This includes previous message history from the thread automatically.
    const { thread } = await fashionAgent.continueThread(ctx, { threadId });
    const { text, messageId } = await thread.generateText({
      prompt: `What is the weather in ${location}?`,
    });
    return { text, messageId };
  },
});

/**
 * Expose the agents as actions
 */
export const weatherAgentStep = weatherAgent.asAction({ maxSteps: 10 });
export const fashionAgentStep = fashionAgent.asAction();

/**
 * Use agent actions in a workflow
 * Note: you can also call regular actions that call agents within the action
 */

const workflow = new WorkflowManager(components.workflow);
const s = internal.example; // where steps are defined

export const weatherAgentWorkflow = workflow.define({
  args: { location: v.string() },
  handler: async (step, { location }): Promise<string> => {
    const { threadId } = await step.runAction(s.weatherAgentStep, {
      createThread: {},
    });
    const weather = await step.runAction(s.weatherAgentStep, {
      threadId,
      generateText: { prompt: `What is the weather in ${location}?` },
    });
    const fashionSuggestion = await step.runAction(s.fashionAgentStep, {
      generateText: {
        prompt: `What should I wear in ${location} if the weather is ${weather}?`,
      },
    });
    console.log(fashionSuggestion);
    return fashionSuggestion;
  },
});

/**
 * Query & subscribe to messages & threads
 */

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

/**
 * Streaming
 */

export const streamText = action({
  args: { prompt: v.string() },
  handler: async (ctx, { prompt }) => {
    const { threadId, thread } = await weatherAgent.createThread(ctx, {});
    const result = await thread.streamText({ prompt });
    for await (const chunk of result.textStream) {
      console.log(chunk);
    }
    return { threadId, text: result.text };
  },
});

// Registered in http.ts
export const streamHttpAction = httpAction(async (ctx, request) => {
  const { threadId, prompt } = (await request.json()) as {
    threadId?: string;
    prompt: string;
  };
  const { thread } = threadId
    ? await weatherAgent.continueThread(ctx, { threadId })
    : await weatherAgent.createThread(ctx, {});
  const result = await thread.streamText({ prompt });
  return result.toTextStreamResponse();
});

/**
 * Manual search
 */

export const searchMessages = action({
  args: {
    text: v.string(),
    userId: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, { text, userId, threadId }) => {
    return weatherAgent.fetchContextMessages(ctx, {
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

/**
 * Generate an object
 */

export const generateObject = action({
  args: { prompt: v.string() },
  handler: async (ctx, { prompt }) => {
    const { threadId, thread } = await weatherAgent.createThread(ctx, {});
    const result = await thread.streamObject({
      output: "object",
      schema: z.object({
        location: z.string(),
        weather: z.string(),
      }),
      prompt,
    });
    for await (const chunk of result.partialObjectStream) {
      console.log(chunk);
    }
    return { threadId, object: result.object };
  },
});
