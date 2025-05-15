/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { modules } from "./setup.test.js";
import { Id } from "./_generated/dataModel.js";
import { getMaxMessage } from "./messages.js";

describe("agent", () => {
  test("add and subtract", async () => {
    const t = convexTest(schema, modules);
  });
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
      return await getMaxMessage(ctx, thread._id as Id<"threads">, "test");
    });
    expect(maxMessage).toEqual({
      _id: messages.at(-1)!._id,
      order: 1,
      stepOrder: 0,
    });
  });
});
