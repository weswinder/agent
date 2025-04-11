import { paginationOptsValidator, PaginationResult } from "convex/server";
import { WorkflowManager } from "@convex-dev/workflow";
import { Agent, createTool } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { action, httpAction, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { z } from "zod";
import { ThreadDoc } from "../../src/client/types";
import { getGeocoding, getWeather } from "./weather";
import { tool } from "ai";

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
  maxSteps: 3,
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
        console.log("getting user preferences", args);
        return {
          userId: ctx.userId,
          threadId: ctx.threadId,
          search: args.search,
          information: `The user likes to look stylish`,
        };
      },
    }),
  },
  maxSteps: 5,
});

// Use the agent from within a normal action:
export const createThread = action({
  args: { location: v.string(), userId: v.optional(v.string()) },
  handler: async (ctx, { location, userId }) => {
    const { threadId, thread } = await weatherAgent.createThread(ctx, {
      userId,
      title: `Weather in ${location}`,
    });
    const result = await thread.generateText({
      prompt: `What is the weather in ${location}?`,
    });
    return { threadId, text: result.text };
  },
});

export const continueThread = action({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    // This includes previous message history from the thread automatically.
    const { thread } = await fashionAgent.continueThread(ctx, { threadId });
    const { text, messageId } = await thread.generateText({
      prompt: `What should I wear  based on the weather?`,
    });
    return { text, messageId };
  },
});

/**
 * Expose the agents as actions
 */
export const weatherAgentAction = weatherAgent.asAction({ maxSteps: 3 });
export const fashionAgentAction = fashionAgent.asAction();

/**
 * Use agent actions in a workflow
 * Note: you can also call regular actions that call agents within the action
 */

const workflow = new WorkflowManager(components.workflow);
const s = internal.example; // where steps are defined

export const weatherAgentWorkflow = workflow.define({
  args: { location: v.string() },
  handler: async (step, { location }): Promise<string> => {
    const threadId = await step.runAction(s.weatherAgentAction, {
      createThread: {},
    });
    console.log("threadId", threadId);
    const weather = await step.runAction(s.weatherAgentAction, {
      threadId,
      generateText: { prompt: `What is the weather in ${location}?` },
    });
    console.log("weather", weather);
    const fashionSuggestion = await step.runAction(s.fashionAgentAction, {
      threadId,
      generateText: {
        prompt: `What should I wear in ${location} if the weather is ${weather}?`,
      },
    });
    console.log("fashionSuggestion", fashionSuggestion);
    return fashionSuggestion;
  },
});

export const startWorkflow = mutation({
  args: { location: v.string() },
  handler: async (ctx, { location }) => {
    await workflow.start(ctx, internal.example.weatherAgentWorkflow, {
      location,
    });
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
      isTool: false,
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
    return {
      threadId,
      text: await result.text,
      toolCalls: await result.toolCalls,
      toolResults: await result.toolResults,
    };
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

export const t = action({
  args: {},
  handler: async (ctx) => {
    const fastAgent = new Agent(components.agent, {
      chat: openai.chat("gpt-4o-mini"),
      textEmbedding: openai.embedding("text-embedding-3-small"),
      instructions: "You are a helpful assistant.",
      tools: {
        doSomething: tool({
          description: "Call this function when asked to do something",
          parameters: z.object({}),
          execute: async (args) => {
            console.log("doSomething", args);
            return "hello";
          },
        }),
        doSomethingElse: tool({
          description: "Call this function when asked to do something else",
          parameters: z.object({}),
          execute: async (args) => {
            console.log("doSomethingElse", args);
            return "hello";
          },
        }),
      },
      maxSteps: 5,
    });

    const { threadId, thread } = await fastAgent.createThread(ctx, {});
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    const s = await thread.streamText({
      prompt:
        "Do something four times, then do something else, then do something else again",
    });
    console.log("s", s);

    for await (const chunk of s.textStream) {
      console.log(chunk);
    }
    // return result.text;
  },
});
