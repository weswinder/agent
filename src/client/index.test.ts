import { describe, expect, test } from "vitest";
import { filterOutOrphanedToolMessages, type MessageDoc } from ".";

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
