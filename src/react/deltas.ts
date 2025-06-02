import type { TextPart, ToolCallPart, ToolResultPart } from "ai";
import type { MessageDoc } from "../client";
import type { StreamDelta, StreamMessage, TextStreamPart } from "../validators";
import type { UIMessage } from "./toUIMessages";
import { toUIMessages } from "./toUIMessages";

export { toUIMessages, type UIMessage };

export function mergeDeltas(
  threadId: string,
  streamMessages: StreamMessage[],
  existingStreams: Array<{
    stream: StreamMessage;
    cursor: number;
    messages: MessageDoc[];
  }>,
  allDeltas: StreamDelta[]
): [
  MessageDoc[],
  Array<{ stream: StreamMessage; cursor: number; messages: MessageDoc[] }>,
  boolean,
] {
  const newStreams: Array<{
    stream: StreamMessage;
    cursor: number;
    messages: MessageDoc[];
  }> = [];
  // Seed the existing chunks
  let changed = false;
  for (const streamMessage of streamMessages) {
    const deltas = allDeltas
      .filter((d) => d.streamId === streamMessage.streamId)
      .sort((a, b) => a.start - b.start);
    const existing = existingStreams.find(
      (s) => s.stream.streamId === streamMessage.streamId
    );
    const [newStream, messageChanged] = applyDeltasToStreamMessage(
      threadId,
      streamMessage,
      existing,
      deltas
    );
    newStreams.push(newStream);
    if (messageChanged) changed = true;
  }
  for (const { stream } of existingStreams) {
    if (!newStreams.find((s) => s.stream.streamId === stream.streamId)) {
      // There's a stream that's no longer active.
      changed = true;
    }
  }
  const messages = newStreams
    .sort(
      (a, b) =>
        a.stream.order - b.stream.order ||
        a.stream.stepOrder - b.stream.stepOrder
    )
    .map((s) => s.messages)
    .flat();
  return [messages, newStreams, changed];
}

// exported for testing
export function applyDeltasToStreamMessage(
  threadId: string,
  streamMessage: StreamMessage,
  existing:
    | { stream: StreamMessage; cursor: number; messages: MessageDoc[] }
    | undefined,
  deltas: StreamDelta[]
): [
  { stream: StreamMessage; cursor: number; messages: MessageDoc[] },
  boolean,
] {
  let changed = false;
  const newStream = {
    stream: streamMessage,
    cursor: existing?.cursor ?? 0,
    messages: existing?.messages ?? [],
  };
  let parts: TextStreamPart[] = [];
  for (const delta of deltas) {
    if (delta.parts.length === 0) {
      console.warn(`Got delta for stream ${delta.streamId} with no parts`);
      continue;
    }
    if (newStream.cursor !== delta.start) {
      if (newStream.cursor >= delta.end) {
        console.debug(
          `Got duplicate delta for stream ${delta.streamId} at ${delta.start}`
        );
        continue;
      } else if (newStream.cursor < delta.start) {
        console.warn(
          `Got delta for stream ${delta.streamId} that has a gap ${newStream.cursor} -> ${delta.start}`
        );
        continue;
      } else {
        throw new Error(
          `Got unexpected delta for stream ${delta.streamId}: delta: ${delta.start} -> ${delta.end} existing cursor: ${newStream.cursor}`
        );
      }
    }
    changed = true;
    newStream.cursor = delta.end;
    parts.push(...delta.parts);
  }
  if (!changed) {
    return [existing ?? newStream, false];
  }

  if (!newStream.messages.at(-1)) {
    newStream.messages.push(
      createStreamingMessage(
        threadId,
        streamMessage,
        parts[0]!,
        newStream.messages.length
      )
    );
    parts = parts.slice(1);
  }
  let currentMessage = newStream.messages.at(-1)!;
  let lastContent = getLastContent(currentMessage);
  for (const part of parts) {
    let contentToAdd:
      | TextPart
      | ToolCallPart
      | { type: "reasoning"; text: string }
      | ToolResultPart
      | undefined;
    const isToolRole = part.type === "source" || part.type === "tool-result";
    if (isToolRole !== (currentMessage.message!.role === "tool")) {
      currentMessage = createStreamingMessage(
        threadId,
        streamMessage,
        part,
        newStream.messages.length
      );
      lastContent = getLastContent(currentMessage);
      newStream.messages.push(currentMessage);
      continue;
    }
    switch (part.type) {
      case "text-delta":
        currentMessage.text += part.textDelta;
        if (lastContent?.type === "text") {
          lastContent.text += part.textDelta;
        } else {
          contentToAdd = {
            type: "text",
            text: part.textDelta,
          };
        }
        break;
      case "tool-call-streaming-start":
        currentMessage.tool = true;
        contentToAdd = {
          type: "tool-call",
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          args: "",
        };
        break;
      case "tool-call-delta":
        {
          currentMessage.tool = true;
          if (lastContent?.type !== "tool-call") {
            throw new Error("Expected last content to be a tool call");
          }
          if (typeof lastContent.args !== "string") {
            throw new Error("Expected args to be a string");
          }
          lastContent.args += part.argsTextDelta;
        }
        break;
      case "tool-call":
        currentMessage.tool = true;
        contentToAdd = part;
        break;
      case "reasoning":
        if (lastContent?.type === "reasoning") {
          lastContent.text += part.textDelta;
        } else {
          contentToAdd = {
            type: "reasoning",
            text: part.textDelta,
          };
        }
        break;
      case "source":
        if (!currentMessage.sources) {
          currentMessage.sources = [];
        }
        currentMessage.sources.push(part.source);
        break;
      case "tool-result":
        contentToAdd = part;
        break;
      default:
        console.warn(`Received unexpected part: ${JSON.stringify(part)}`);
        break;
    }
    if (contentToAdd) {
      if (!currentMessage.message!.content) {
        currentMessage.message!.content = [];
      }
      if (!Array.isArray(currentMessage.message?.content)) {
        throw new Error("Expected message content to be an array");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentMessage.message.content.push(contentToAdd as any);
      lastContent = contentToAdd;
    }
  }
  return [newStream, true];
}

function getLastContent(message: MessageDoc) {
  if (Array.isArray(message.message?.content)) {
    return message.message.content.at(-1);
  }
  return undefined;
}

export function createStreamingMessage(
  threadId: string,
  message: StreamMessage,
  part: TextStreamPart,
  index: number
): MessageDoc {
  const { streamId, ...rest } = message;
  const metadata: MessageDoc = {
    _id: `${streamId}-${index}`,
    _creationTime: Date.now(),
    status: "pending",
    threadId,
    tool: false,
    ...rest,
  };
  switch (part.type) {
    case "text-delta":
      return {
        ...metadata,
        message: {
          role: "assistant",
          content: [{ type: "text", text: part.textDelta }],
        },
        text: part.textDelta,
      };
    case "tool-call-streaming-start":
      return {
        ...metadata,
        tool: true,
        message: {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolName: part.toolName,
              toolCallId: part.toolCallId,
              args: "", // when it's a string, it's a partial call
            },
          ],
        },
      };
    case "reasoning":
      return {
        ...metadata,
        message: {
          role: "assistant",
          content: [{ type: "reasoning", text: part.textDelta }],
        },
        reasoning: part.textDelta,
      };
    case "source":
      console.warn("Received source part first??");
      return {
        ...metadata,
        tool: true,
        message: { role: "tool", content: [] },
        sources: [part.source],
      };
    case "tool-call":
      return {
        ...metadata,
        tool: true,
        message: { role: "assistant", content: [part] },
      };
    case "tool-call-delta":
      console.warn("Received tool call delta part first??");
      return {
        ...metadata,
        tool: true,
        message: {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              args: part.argsTextDelta,
            },
          ],
        },
      };
    case "tool-result":
      return {
        ...metadata,
        tool: true,
        message: { role: "tool", content: [part] },
      };
    default:
      throw new Error(`Unexpected part type: ${JSON.stringify(part)}`);
  }
}
