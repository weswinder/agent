/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { modules } from "./setup.test.js";
import { Id } from "./_generated/dataModel.js";
import { getMaxMessage } from "./messages.js";

describe("agent", () => {
  test("getMaxMessage works for threads", async () => {
    const t = convexTest(schema, modules);
    const thread = await t.mutation(api.threads.createThread, {
      userId: "test",
    });
    const { messages } = await t.mutation(api.messages.addMessages, {
      threadId: thread._id as Id<"threads">,
      messages: [
        { message: { role: "user", content: "hello" } },
        { message: { role: "assistant", content: "world" } },
      ],
    });
    const maxMessage = await t.run(async (ctx) => {
      return await getMaxMessage(ctx, thread._id as Id<"threads">);
    });
    expect(maxMessage).toMatchObject({
      _id: messages.at(-1)!._id,
      order: 0,
      stepOrder: 1,
    });
  });
  test("getMaxMessages works when there are tools involved", async () => {
    const t = convexTest(schema, modules);
    const thread = await t.mutation(api.threads.createThread, {
      userId: "test",
    });
    const { messages } = await t.mutation(api.messages.addMessages, {
      threadId: thread._id as Id<"threads">,
      messages: [
        { message: { role: "user", content: "hello" } },
        {
          message: {
            role: "assistant",
            content: [
              {
                type: "tool-call",
                args: { a: 1 },
                toolCallId: "1",
                toolName: "tool",
              },
            ],
          },
        },
        {
          message: {
            role: "tool",
            content: [
              {
                type: "tool-result",
                toolName: "tool",
                result: "foo",
                toolCallId: "1",
              },
            ],
          },
        },
        { message: { role: "assistant", content: "world" } },
      ],
    });
    const maxMessage = await t.run(async (ctx) => {
      return await getMaxMessage(ctx, thread._id as Id<"threads">);
    });
    expect(maxMessage).toMatchObject({
      _id: messages.at(-1)!._id,
      order: 0,
      stepOrder: 3,
    });
  });

  test("ordering is incremented on subsequent calls to addMessages", async () => {
    const t = convexTest(schema, modules);
    const thread = await t.mutation(api.threads.createThread, {
      userId: "test",
    });
    const { messages } = await t.mutation(api.messages.addMessages, {
      threadId: thread._id as Id<"threads">,
      messages: [{ message: { role: "user", content: "hello" } }],
    });
    const maxMessage = await t.run(async (ctx) => {
      return await getMaxMessage(ctx, thread._id as Id<"threads">);
    });
    expect(maxMessage).toMatchObject({
      _id: messages.at(-1)!._id,
      order: 0,
      stepOrder: 0,
    });
    const { messages: messages2 } = await t.mutation(api.messages.addMessages, {
      threadId: thread._id as Id<"threads">,
      messages: [{ message: { role: "user", content: "hello" } }],
    });
    const maxMessage2 = await t.run(async (ctx) => {
      return await getMaxMessage(ctx, thread._id as Id<"threads">);
    });
    expect(maxMessage2).toMatchObject({
      _id: messages2.at(-1)!._id,
      order: 1,
      stepOrder: 0,
    });
  });

  test("sub order is incremented on subsequent calls to addMessages for the same promptMessageId", async () => {
    const t = convexTest(schema, modules);
    const thread = await t.mutation(api.threads.createThread, {
      userId: "test",
    });
    const { messages } = await t.mutation(api.messages.addMessages, {
      threadId: thread._id as Id<"threads">,
      messages: [{ message: { role: "user", content: "hello" } }],
    });
    const maxMessage = await t.run(async (ctx) => {
      return await getMaxMessage(ctx, thread._id as Id<"threads">);
    });
    expect(maxMessage).toMatchObject({
      _id: messages.at(-1)!._id,
      order: 0,
      stepOrder: 0,
    });
    const { messages: messages2 } = await t.mutation(api.messages.addMessages, {
      threadId: thread._id as Id<"threads">,
      messages: [{ message: { role: "user", content: "hello" } }],
      promptMessageId: messages.at(-1)!._id,
    });
    const maxMessage2 = await t.run(async (ctx) => {
      return await getMaxMessage(ctx, thread._id as Id<"threads">);
    });
    expect(maxMessage2).toMatchObject({
      _id: messages2.at(-1)!._id,
      order: 0,
      stepOrder: 1,
    });
  });
});
