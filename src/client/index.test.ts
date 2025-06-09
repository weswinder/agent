import { describe, expect, test } from "vitest";
import { Agent, filterOutOrphanedToolMessages, type MessageDoc } from ".";
import type { DataModelFromSchemaDefinition } from "convex/server";
import {
  anyApi,
  queryGeneric,
  mutationGeneric,
  actionGeneric,
} from "convex/server";
import type {
  ApiFromModules,
  ActionBuilder,
  MutationBuilder,
  QueryBuilder,
} from "convex/server";
import { v } from "convex/values";
import { defineSchema } from "convex/server";
import { MockLanguageModelV1 } from "ai/test";
import type { LanguageModelV1, LanguageModelV1StreamPart } from "ai";
import { simulateReadableStream } from "ai";
import { components, initConvexTest } from "./setup.test";

const schema = defineSchema({});
type DataModel = DataModelFromSchemaDefinition<typeof schema>;
// type DatabaseReader = GenericDatabaseReader<DataModel>;
const query = queryGeneric as QueryBuilder<DataModel, "public">;
const mutation = mutationGeneric as MutationBuilder<DataModel, "public">;
const action = actionGeneric as ActionBuilder<DataModel, "public">;

const agent = new Agent(components.agent, {
  name: "test",
  instructions: "You are a test agent",
  // TODO: get mock model that works in v8
  chat: mockModel(),
});

export const testQuery = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    return await agent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: {
        cursor: null,
        numItems: 10,
      },
      excludeToolMessages: true,
      statuses: ["success"],
    });
  },
});

export const createThread = mutation({
  args: {},
  handler: async (ctx) => {
    return await agent.createThread(ctx, {
      userId: "1",
    });
  },
});

export const createAndGenerate = action({
  args: {},
  handler: async (ctx) => {
    const { thread } = await agent.createThread(ctx, {
      userId: "1",
    });
    const result = await thread.generateText({
      messages: [{ role: "user", content: "Hello" }],
    });
    return result.text;
  },
});

const testApi: ApiFromModules<{
  fns: {
    createAndGenerate: typeof createAndGenerate;
    createThread: typeof createThread;
    testQuery: typeof testQuery;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}>["fns"] = anyApi["index.test"] as any;

describe("Agent thick client", () => {
  test("should create a thread", async () => {
    const t = initConvexTest(schema);
    const result = await t.mutation(testApi.createThread, {});
    expect(result.threadId).toBeTypeOf("string");
  });
  test("should create a thread and generate text", async () => {
    const t = initConvexTest(schema);
    const result = await t.action(testApi.createAndGenerate, {});
    expect(result).toBeDefined();
    expect(result).toMatch("This is a sample response");
  });
});

describe("filterOutOrphanedToolMessages", () => {
  const call1: MessageDoc = {
    _id: "call1",
    _creationTime: Date.now(),
    order: 1,
    stepOrder: 1,
    tool: true,
    message: {
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "1",
          toolName: "tool1",
          args: { test: "test" },
        },
      ],
    },
    status: "success",
    threadId: "1",
  };
  const response1: MessageDoc = {
    _id: "response1",
    _creationTime: Date.now(),
    order: 1,
    stepOrder: 1,
    tool: true,
    message: {
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: "1",
          toolName: "tool1",
          result: { test: "test" },
        },
      ],
    },
    status: "success",
    threadId: "1",
  };
  const call2: MessageDoc = {
    _id: "call2",
    _creationTime: Date.now(),
    order: 1,
    stepOrder: 2,
    tool: true,
    message: {
      role: "assistant",
      content: [{ type: "text", text: "Hello" }],
    },
    status: "success",
    threadId: "1",
  };
  test("should not filter out extra tool calls", () => {
    expect(filterOutOrphanedToolMessages([call1, response1, call2])).toEqual([
      call1,
      response1,
      call2,
    ]);
  });
  test("should filter out extra tool calls", () => {
    expect(filterOutOrphanedToolMessages([response1, call2])).toEqual([call2]);
  });
});

function mockModel(): LanguageModelV1 {
  return new MockLanguageModelV1({
    provider: "mock",
    modelId: "mock",
    doGenerate: async ({ prompt }) => ({
      finishReason: "stop",
      usage: { completionTokens: 10, promptTokens: 3 },
      logprobs: undefined,
      rawCall: { rawPrompt: null, rawSettings: {} },
      text: `This is a sample response to ${JSON.stringify(prompt)}`,
    }),
    doStream: async ({ prompt }) => ({
      stream: simulateReadableStream({
        chunkDelayInMs: 50,
        initialDelayInMs: 100,
        chunks: [
          {
            type: "text-delta",
            textDelta: `This is a sample response to ${JSON.stringify(prompt)}`,
          },
          {
            type: "finish",
            finishReason: "stop",
            logprobs: undefined,
            usage: { completionTokens: 10, promptTokens: 3 },
          },
        ] as LanguageModelV1StreamPart[],
      }),
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  });
}
