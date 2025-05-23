import {
  FunctionArgs,
  FunctionReference,
  OptionalRestArgs,
} from "convex/server";
import { useState, useMemo, useEffect } from "react";
import { StreamArgs } from "../validators";
import { BetterOmit, EmptyObject } from "convex-helpers";
import { JSONValue, TextStreamPart, UIMessage } from "ai";
import { ToolInvocationUIPart } from "@ai-sdk/ui-utils";
import { ToolSet } from "ai";
import { useQuery } from "convex/react";
export { toUIMessages } from "./toUIMessages";

type StreamCursor = {
  key: string;
  cursor: number;
};

type StreamMessage = {
  key: string;
  cursor: number;
  deltas: TextStreamPart<ToolSet>[];
};

export type StreamReturns = {
  isDone: boolean;
  messages: StreamMessage[];
};
// TODO: pass in the messages we need to watch? that way it can be consistent..
export function useStreamMessagesQuery<Query extends StreamQuery>(
  query: Query,
  ...args: StreamArgsArray<Query>
): Array<UIMessage> | undefined {
  const [messages, setMessages] = useState<StreamMessage[] | undefined>(
    undefined
  );
  const originalArgs = args[0] === "skip" ? args : args[0] ?? {};
  const argsWithStreamArgs = useMemo(
    () =>
      args[0] === "skip" || !messages
        ? args
        : ({
            ...originalArgs,
            streamArgs: messages.map(messageCursor),
          } as FunctionArgs<Query>),
    [messages]
  );
  const results = useQuery(
    query,
    ...([argsWithStreamArgs] as OptionalRestArgs<Query>)
  );
  // const [isDone, setIsDone] = useState(false);
  useEffect(() => {
    if (!results) return;
    const newMessages = results.messages.map(messageCursor);
    let matches = messages && newMessages.length === messages.length;
    if (matches) {
      for (let i = 0; i < newMessages.length; i++) {
        const newMessage = newMessages[i];
        const oldMessage = messages![i];
        if (
          !Object.is(newMessage.cursor, oldMessage.cursor) &&
          (newMessage.cursor !== oldMessage.cursor ||
            newMessage.key !== oldMessage.key)
        ) {
          matches = false;
          break;
        }
      }
    }
    if (!matches) {
      setMessages(
        results.messages.map((result) => {
          const existingMessage = messages?.find((m) => m.key === result.key);
          if (existingMessage && existingMessage.cursor === result.cursor) {
            return existingMessage;
          }
          const existingDeltas = existingMessage?.deltas ?? [];
          return {
            key: result.key,
            cursor: result.cursor,
            deltas: [...existingDeltas, ...result.deltas],
          };
        })
      );
    }
  }, [results]);
  const keyOrder = useMemo(() => {
    return results?.messages.map((m) => m.key) ?? [];
  }, [results]);
  const uiMessages = useMemo(() => {
    return messages
      ? streamMessagesToUIMessages(messages, keyOrder)
      : undefined;
  }, [messages, JSON.stringify(keyOrder)]);
  return uiMessages;
}

function createUIMessageFromPart(
  part: TextStreamPart<ToolSet>,
  metadata: {
    id: string;
    createdAt: Date;
  }
): UIMessage {
  switch (part.type) {
    case "text-delta":
      return {
        ...metadata,
        role: "assistant",
        content: part.textDelta,
        parts: [{ type: "text", text: part.textDelta }],
      };
    case "tool-call-streaming-start":
      return {
        ...metadata,
        role: "assistant",
        content: "",
        parts: [
          {
            type: "tool-invocation",
            toolInvocation: {
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              args: {},
              state: "partial-call",
            },
          },
        ],
      };
    case "error":
      return {
        ...metadata,
        role: "assistant",
        content: "",
        parts: [],
        annotations: [part as JSONValue],
      };
    default:
      throw new Error(`Unexpected first part type: ${part.type}`);
  }
}

export function streamMessagesToUIMessages(
  messages: StreamMessage[],
  keyOrder: string[]
): UIMessage[] {
  const uiMessagesByMessageId: Record<string, UIMessage[]> = {};
  for (const message of messages) {
    if (message.deltas.length === 0) {
      continue;
    }
    if (!uiMessagesByMessageId[message.key]) {
      uiMessagesByMessageId[message.key] = [];
    }
    if (uiMessagesByMessageId[message.key].length === 0) {
      uiMessagesByMessageId[message.key] = [
        createUIMessageFromPart(message.deltas[0], {
          id: message.key,
          createdAt: new Date(),
        }),
      ];
    }
    const currentMessage = uiMessagesByMessageId[message.key].at(-1)!;
    const lastPart = currentMessage.parts.at(-1);
    for (const delta of message.deltas) {
      switch (delta.type) {
        case "text-delta":
          currentMessage.content += delta.textDelta;
          if (lastPart?.type === "text") {
            lastPart.text += delta.textDelta;
          } else {
            currentMessage.parts.push({
              type: "text",
              text: delta.textDelta,
            });
          }
          break;
        case "tool-call-delta": {
          let lastToolInvocation: ToolInvocationUIPart | undefined;
          for (let i = currentMessage.parts.length - 1; i >= 0; i--) {
            const part = currentMessage.parts[i];
            if (
              part.type === "tool-invocation" &&
              part.toolInvocation.state === "partial-call"
            ) {
              lastToolInvocation = part;
              break;
            }
          }
          if (lastToolInvocation) {
            lastToolInvocation.toolInvocation = {
              ...lastToolInvocation.toolInvocation,
              state: "call",
            };
            break;
          }
          console.error(
            `Received a tool call delta without a previous tool invocation: ${JSON.stringify(currentMessage.parts)}, creating one anyways...`
          );
        }
        // fallthrough
        case "tool-call-streaming-start":
          currentMessage.parts.push({
            type: "tool-invocation",
            toolInvocation: {
              toolCallId: delta.toolCallId,
              toolName: delta.toolName,
              args: {},
              state: "partial-call",
              step:
                currentMessage.parts.filter(
                  (part) => part.type === "tool-invocation"
                ).length + 1,
            },
          });
          break;
        case "reasoning":
          if (lastPart?.type === "reasoning") {
            lastPart.reasoning += delta.textDelta;
          } else {
            currentMessage.parts.push({
              type: "reasoning",
              reasoning: delta.textDelta,
              details: [],
            });
          }
          break;
        case "source":
          currentMessage.parts.push({
            type: "source",
            source: delta.source,
          });
          break;
        default:
          console.warn(`Received unexpected part: ${JSON.stringify(delta)}`);
          break;
      }
    }
  }
  return keyOrder.map((key) => uiMessagesByMessageId[key]).flat();
}

function messageCursor({ cursor, key }: StreamMessage): StreamCursor {
  return { cursor, key };
}

if (typeof window === "undefined") {
  throw new Error("this is frontend code, but it's running somewhere else!");
}
type StreamQuery<Args = unknown> = FunctionReference<
  "query",
  "public",
  { streamArgs: StreamArgs } & Args,
  StreamReturns
>;

export type StreamArgsArray<Query extends StreamQuery> =
  keyof FunctionArgs<Query> extends "streamArgs"
    ? [args?: EmptyObject | "skip"]
    : [args: BetterOmit<FunctionArgs<Query>, "streamArgs"> | "skip"];

/**
 * @deprecated use useStreamMessagesQuery instead
 * Use this hook to stream text from a server action, using the
 * toTextStreamResponse or equivalent HTTP streaming endpoint returning text.
 * @param url The URL of the server action to stream text from.
 *   e.g. https://....convex.site/yourendpoint
 * @param threadId The ID of the thread to stream text from.
 * @param token The auth token to use for the request.
 *   e.g. useAuthToken() from @convex-dev/auth/react
 * @returns A tuple containing the {text, loading, error} and a function to call the endpoint
 * with a given prompt, passing up { prompt, threadId } as the body in JSON.
 */
export function useStreamingText(
  url: string,
  threadId: string | null,
  token?: string
) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const readStream = useMemo(
    () => async (prompt: string) => {
      if (!threadId) return;
      try {
        setText("");
        setLoading(true);
        setError(null);
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ prompt, threadId }),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        if (!response.body) {
          throw new Error("No body");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          accumulatedText += decoder.decode(value);
          setText(accumulatedText);
        }
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          setError(e);
        }
      } finally {
        setLoading(false);
      }
    },
    [threadId, token]
  );
  return [{ text, loading, error }, readStream] as const;
}
