import type { TextPart, ToolCallPart, ToolResultPart } from "ai";
import type { BetterOmit, ErrorMessage, Expand } from "convex-helpers";
import {
  insertAtTop,
  type PaginatedQueryArgs,
  usePaginatedQuery,
  type UsePaginatedQueryResult,
  useQuery,
} from "convex/react";
import type {
  FunctionArgs,
  FunctionReference,
  PaginationOptions,
  PaginationResult,
} from "convex/server";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MessageDoc } from "../client";
import type { SyncStreamsReturnValue } from "../client/types";
import type {
  StreamArgs,
  StreamDelta,
  StreamMessage,
  TextStreamPart,
} from "../validators";
import type { UIMessage } from "./toUIMessages";
import { toUIMessages } from "./toUIMessages";
import { OptimisticLocalStore } from "convex/browser";

export { toUIMessages, type UIMessage };

/**
 * A hook that fetches messages from a thread.
 *
 * This hook is a wrapper around `usePaginatedQuery` and `useStreamingThreadMessages`.
 * It will fetch both full messages and streaming messages, and merge them together.
 *
 * The query must take as arguments `{ threadId, paginationOpts }` and return a
 * pagination result of objects that extend `MessageDoc`.
 *
 * For streaming, it should look like this:
 * ```ts
 * export const listThreadMessages = query({
 *   args: {
 *     threadId: v.string(),
 *     paginationOpts: paginationOptsValidator,
 *     streamArgs: vStreamArgs,
 *     ... other arguments you want
 *   },
 *   handler: async (ctx, { threadId, paginationOpts, streamArgs }) => {
 *     // await authorizeThreadAccess(ctx, threadId);
 *     const paginated = await agent.listMessages(ctx, { threadId, paginationOpts });
 *     const streams = await agent.syncStreams(ctx, { threadId, streamArgs });
 *     // Here you could filter out / modify the documents & stream deltas.
 *     return { ...paginated, streams };
 *   },
 * });
 * ```
 *
 * Then the hook can be used like this:
 * ```ts
 * const messages = useThreadMessages(
 *   api.myModule.listThreadMessages,
 *   { threadId },
 *   { initialNumItems: 10, stream: true }
 * );
 * ```
 *
 * @param query The query to use to fetch messages.
 * It must take as arguments `{ threadId, paginationOpts }` and return a
 * pagination result of objects that extend `MessageDoc`.
 * To support streaming, it must also take in `streamArgs: vStreamArgs` and
 * return a `streams` object returned from `agent.syncStreams`.
 * @param args The arguments to pass to the query other than `paginationOpts`
 * and `streamArgs`. So `{ threadId }` at minimum, plus any other arguments that
 * you want to pass to the query.
 * @param options The options for the query. Similar to usePaginatedQuery.
 * To enable streaming, pass `stream: true`.
 * @returns The messages. If stream is true, it will return a list of messages
 *   that includes both full messages and streaming messages.
 */
export function useThreadMessages<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Query extends ThreadQuery<any, any>,
>(
  query: Query,
  args: ThreadMessagesArgs<Query> | "skip",
  options: {
    initialNumItems: number;
    stream?: Query extends ThreadStreamQuery
      ? boolean
      : ErrorMessage<"To enable streaming, your query must take in streamArgs: vStreamArgs and return a streams object returned from agent.syncStreams. See docs.">;
  }
): UsePaginatedQueryResult<
  ThreadMessagesResult<Query> & { streaming?: boolean }
> {
  // These are full messages
  const paginated = usePaginatedQuery(
    query,
    args as PaginatedQueryArgs<Query> | "skip",
    { initialNumItems: options.initialNumItems }
  );

  // These are streaming messages that will not include full messages.
  const streamMessages = useStreamingThreadMessages(
    query as ThreadStreamQuery<
      ThreadMessagesArgs<Query>,
      ThreadMessagesResult<Query>
    >,
    !options.stream ? "skip" : args
  );

  const merged = useMemo(() => {
    const streamListMessages =
      streamMessages?.map((m) => ({
        ...m,
        streaming: true,
      })) ?? [];
    return {
      ...paginated,
      results: paginated.results
        .map((m) => ({ ...m, streaming: false }))
        .concat(streamListMessages)
        .sort((a, b) =>
          a.order === b.order ? a.stepOrder - b.stepOrder : a.order - b.order
        )
        // They shouldn't overlap, but check for duplicates just in case.
        .filter(
          (m, i, arr) =>
            !arr[i - 1] ||
            m.order !== arr[i - 1].order ||
            m.stepOrder !== arr[i - 1].stepOrder
        ),
    };
  }, [paginated, streamMessages]);

  return merged as ThreadMessagesResult<Query>;
}

/**
 * A hook that fetches streaming messages from a thread.
 * This ONLY returns streaming messages. To get both, use `useThreadMessages`.
 *
 * @param query The query to use to fetch messages.
 * It must take as arguments `{ threadId, paginationOpts, streamArgs }` and
 * return a `streams` object returned from `agent.syncStreams`.
 * @param args The arguments to pass to the query other than `paginationOpts`
 * and `streamArgs`. So `{ threadId }` at minimum, plus any other arguments that
 * you want to pass to the query.
 * @returns The streaming messages.
 */
export function useStreamingThreadMessages<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Query extends ThreadStreamQuery<any, any>,
>(
  query: Query,
  args: ThreadMessagesArgs<Query> | "skip"
): Array<ThreadMessagesResult<Query>> | undefined {
  // Invariant: streamMessages[streamId] is comprised of all deltas up to the
  // cursor. There can be multiple messages in the same stream, e.g. for tool
  // calls.
  const [streams, setStreams] = useState<
    Array<{ stream: StreamMessage; cursor: number; messages: MessageDoc[] }>
  >([]);
  // Get all the active streams
  const streamList = useQuery(
    query,
    args === "skip"
      ? args
      : ({
          ...args,
          paginationOpts: { cursor: null, numItems: 0 },
          streamArgs: { kind: "list" } as StreamArgs,
        } as FunctionArgs<Query>)
  ) as
    | { streams: Extract<SyncStreamsReturnValue, { kind: "list" }> }
    | undefined;
  // Get the cursors for all the active streams
  const cursors = useMemo(() => {
    if (!streamList?.streams) return [];
    if (streamList.streams.kind !== "list") {
      throw new Error("Expected list streams");
    }
    return streamList.streams.messages.map(({ streamId }) => {
      const stream = streams.find((s) => s.stream.streamId === streamId);
      // Because of the invariant, we can just take the last chunk's end.
      const cursor = stream?.cursor ?? 0;
      return { streamId, cursor };
    });
  }, [streamList, streams]);
  // Get the deltas for all the active streams, if any.
  const cursorQuery = useQuery(
    query,
    args === "skip" || !streamList
      ? ("skip" as const)
      : ({
          ...args,
          paginationOpts: { cursor: null, numItems: 0 },
          streamArgs: { kind: "deltas", cursors } as StreamArgs,
        } as FunctionArgs<Query>)
  ) as
    | { streams: Extract<SyncStreamsReturnValue, { kind: "deltas" }> }
    | undefined;
  // Merge any deltas into the streamChunks, keeping it unmodified if unchanged.
  const threadId = args === "skip" ? undefined : args.threadId;
  const [messages, newStreams, changed] = useMemo(() => {
    if (!threadId) return [undefined, streams, false];
    if (!streamList) return [undefined, streams, false];
    if (cursorQuery && cursorQuery.streams?.kind !== "deltas") {
      throw new Error("Expected deltas streams");
    }
    return mergeDeltas(
      threadId,
      streamList.streams.messages,
      streams,
      cursorQuery?.streams?.deltas ?? []
    );
  }, [threadId, cursorQuery, streams, streamList]);
  // Now assemble the chunks into messages
  if (!threadId) {
    return undefined;
  }
  if (changed) {
    setStreams(newStreams);
  }
  return messages as ThreadMessagesResult<Query>[] | undefined;
}

/**
 * A hook that smoothly displays text as it is streamed.
 *
 * @param text The text to display. Pass in the full text each time.
 * @param charsPerSec The number of characters to display per second.
 * @returns A tuple of the visible text and the state of the smooth text,
 * including the current cursor position and whether it's still streaming.
 * This allows you to decide if it's too far behind and you want to adjust
 * the charsPerSec or just prefer the full text.
 */
export function useSmoothText(
  text: string,
  {
    charsPerSec = 512,
  }: {
    /**
     * The number of characters to display per second.
     */
    charsPerSec?: number;
  } = {}
): [string, { cursor: number; isStreaming: boolean }] {
  const [visibleText, setVisibleText] = useState(text);
  const smoothState = useRef({ lastUpdated: Date.now(), cursor: text.length });

  const isStreaming = smoothState.current.cursor < text.length;

  useEffect(() => {
    if (!isStreaming) {
      return;
    }
    function update() {
      if (smoothState.current.cursor >= text.length) {
        return;
      }
      const now = Date.now();
      const timeSinceLastUpdate = now - smoothState.current.lastUpdated;
      const chars = Math.floor((timeSinceLastUpdate * charsPerSec) / 1000);
      smoothState.current.cursor = Math.min(
        smoothState.current.cursor + chars,
        text.length
      );
      smoothState.current.lastUpdated = now;
      setVisibleText(text.slice(0, smoothState.current.cursor));
    }
    update();
    const interval = setInterval(() => {
      update();
    }, 50);
    return () => clearInterval(interval);
  }, [text, isStreaming, charsPerSec]);

  return [visibleText, { cursor: smoothState.current.cursor, isStreaming }];
}

export function optimisticallySendMessage(
  query: ThreadQuery<unknown, MessageDoc>
): (
  store: OptimisticLocalStore,
  args: { threadId: string; prompt: string }
) => void {
  return (store, args) => {
    const queries = store.getAllQueries(query);
    let maxOrder = 0;
    let maxStepOrder = 0;
    for (const q of queries) {
      if (q.args?.threadId !== args.threadId) continue;
      if (q.args.streamArgs) continue;
      for (const m of q.value?.page ?? []) {
        maxOrder = Math.max(maxOrder, m.order);
        maxStepOrder = Math.max(maxStepOrder, m.stepOrder);
      }
    }
    const order = maxOrder + 1;
    const stepOrder = 0;
    insertAtTop({
      paginatedQuery: query,
      argsToMatch: { threadId: args.threadId, streamArgs: undefined },
      item: {
        _creationTime: Date.now(),
        _id: crypto.randomUUID(),
        order,
        stepOrder,
        status: "pending",
        threadId: args.threadId,
        tool: false,
        message: {
          role: "user",
          content: args.prompt,
        },
        text: args.prompt,
      },
      localQueryStore: store,
    });
  };
}

function mergeDeltas(
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
    const [newStream, messageChanged] = applyDeltasToStreamMessages(
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

function applyDeltasToStreamMessages(
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

function createStreamingMessage(
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

type ThreadQuery<
  Args = unknown,
  M extends MessageDoc = MessageDoc,
> = FunctionReference<
  "query",
  "public",
  {
    threadId: string;
    paginationOpts: PaginationOptions;
    // TODO: will this allow passing a function that doesn't have this param?
    /**
     * If { stream: true } is passed, it will also query for stream deltas.
     * In order for this to work, the query must take as an argument streamArgs.
     */
    streamArgs?: StreamArgs;
  } & Args,
  PaginationResult<M> & { streams?: SyncStreamsReturnValue }
>;

type ThreadStreamQuery<
  Args = Record<string, unknown>,
  M extends MessageDoc = MessageDoc,
> = FunctionReference<
  "query",
  "public",
  {
    threadId: string;
    paginationOpts: PaginationOptions;
    streamArgs?: StreamArgs; // required for stream query
  } & Args,
  PaginationResult<M> & { streams: SyncStreamsReturnValue }
>;

type ThreadMessagesArgs<Query extends ThreadQuery<unknown, MessageDoc>> =
  Query extends ThreadQuery<unknown, MessageDoc>
    ? Expand<BetterOmit<FunctionArgs<Query>, "paginationOpts" | "streamArgs">>
    : never;

type ThreadMessagesResult<Query extends ThreadQuery<unknown, MessageDoc>> =
  Query extends ThreadQuery<unknown, infer M> ? M : never;

// TODO: pass in the messages we need to watch? that way it can be consistent..

// export function streamMessagesToUIMessages(
//   messages: StreamsChunk[],
//   keyOrder: string[]
// ): UIMessageOrdered[] {
//   const uiMessagesByMessageId: Record<string, UIMessageOrdered[]> = {};
//   for (const message of messages) {
//     if (message.deltas.length === 0) {
//       continue;
//     }
//     if (!uiMessagesByMessageId[message.key]) {
//       uiMessagesByMessageId[message.key] = [];
//     }
//     if (uiMessagesByMessageId[message.key].length === 0) {
//       uiMessagesByMessageId[message.key] = [
//         createUIMessageFromPart(message.deltas[0], {
//           id: message.key,
//           createdAt: new Date(),
//         }),
//       ];
//     }
//     const currentMessage = uiMessagesByMessageId[message.key].at(-1)!;
//     const lastPart = currentMessage.parts.at(-1);
//     for (const delta of message.deltas) {
//       switch (delta.type) {
//         case "text-delta":
//           currentMessage.content += delta.textDelta;
//           if (lastPart?.type === "text") {
//             lastPart.text += delta.textDelta;
//           } else {
//             currentMessage.parts.push({
//               type: "text",
//               text: delta.textDelta,
//             });
//           }
//           break;
//         case "tool-call-delta": {
//           let lastToolInvocation: ToolInvocationUIPart | undefined;
//           for (let i = currentMessage.parts.length - 1; i >= 0; i--) {
//             const part = currentMessage.parts[i];
//             if (
//               part.type === "tool-invocation" &&
//               part.toolInvocation.state === "partial-call"
//             ) {
//               lastToolInvocation = part;
//               break;
//             }
//           }
//           if (lastToolInvocation) {
//             lastToolInvocation.toolInvocation = {
//               ...lastToolInvocation.toolInvocation,
//               state: "call",
//             };
//             break;
//           }
//           console.error(
//             `Received a tool call delta without a previous tool invocation: ${JSON.stringify(currentMessage.parts)}, creating one anyways...`
//           );
//         }
//         // fallthrough
//         case "tool-call-streaming-start":
//           currentMessage.parts.push({
//             type: "tool-invocation",
//             toolInvocation: {
//               toolCallId: delta.toolCallId,
//               toolName: delta.toolName,
//               args: {},
//               state: "partial-call",
//               step:
//                 currentMessage.parts.filter(
//                   (part) => part.type === "tool-invocation"
//                 ).length + 1,
//             },
//           });
//           break;
//         case "tool-call":
//           currentMessage.parts.push({
//             type: "tool-invocation",
//             toolInvocation: {
//               toolCallId: delta.toolCallId,
//               toolName: delta.toolName,
//               args: delta.args,
//               state: "call",
//               step:
//                 currentMessage.parts.filter(
//                   (part) => part.type === "tool-invocation"
//                 ).length + 1,
//             },
//           });
//           break;
//         case "reasoning":
//           if (lastPart?.type === "reasoning") {
//             lastPart.reasoning += delta.textDelta;
//           } else {
//             currentMessage.parts.push({
//               type: "reasoning",
//               reasoning: delta.textDelta,
//               details: [],
//             });
//           }
//           break;
//         case "source":
//           currentMessage.parts.push({
//             type: "source",
//             source: delta.source,
//           });
//           break;
//         default:
//           console.warn(`Received unexpected part: ${JSON.stringify(delta)}`);
//           break;
//       }
//     }
//   }
//   return keyOrder.map((key) => uiMessagesByMessageId[key]).flat();
// }

if (typeof window === "undefined") {
  throw new Error("this is frontend code, but it's running somewhere else!");
}

/**
 * @deprecated use useThreadMessages or useStreamingThreadMessages instead
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
    [threadId, token, url]
  );
  return [{ text, loading, error }, readStream] as const;
}
