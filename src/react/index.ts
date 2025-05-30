import {
  FunctionArgs,
  FunctionReference,
  PaginationOptions,
  PaginationResult,
  Query,
} from "convex/server";
import { useState, useMemo } from "react";
import {
  StreamArgs,
  StreamCursor,
  StreamDelta,
  StreamMessage,
} from "../validators";
import { BetterOmit, ErrorMessage, Expand } from "convex-helpers";
import { TextStreamPart } from "ai";
import { ToolSet } from "ai";
import {
  useQuery,
  usePaginatedQuery,
  UsePaginatedQueryResult,
  PaginatedQueryArgs,
} from "convex/react";
import { toUIMessages } from "./toUIMessages";
import type { UIMessageOrdered } from "./toUIMessages";
import type { MessageDoc } from "../client";
import type { SyncStreamsReturnValue } from "../client/types";

export { toUIMessages, type UIMessageOrdered };

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query as ThreadStreamQuery<any, any>,
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

export function useStreamingThreadMessages<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Query extends ThreadStreamQuery<any, any>,
>(
  query: Query,
  args: ThreadMessagesArgs<Query> | "skip"
): Array<ThreadMessagesResult<Query>> | undefined {
  // Invariant: streamChunks[streamId] is sorted by start, and doesn't include
  // any chunk where it's start !== the last chunk's end.
  const [streamChunks, setStreamChunks] = useState<
    Record<string, StreamDelta[]>
  >({});
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
      const chunks = streamChunks[streamId];
      // Because of the invariant, we can just take the last chunk's end.
      const cursor = chunks?.at(-1)?.end ?? 0;
      return { streamId, cursor };
    });
  }, [streamList, streamChunks]);
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
  ) as { streams: SyncStreamsReturnValue } | undefined;
  // Merge any deltas into the streamChunks, keeping it unmodified if unchanged.
  const nextChunks = useMemo(() => {
    if (!cursorQuery || !streamList) return streamChunks;
    if (cursorQuery.streams?.kind !== "deltas") {
      throw new Error("Expected deltas streams");
    }
    return mergeChunks(
      streamList.streams.messages,
      streamChunks,
      cursorQuery.streams.deltas
    );
  }, [cursorQuery, streamChunks, streamList]);
  // Now assemble the chunks into messages
  if (args === "skip") {
    return undefined;
  }
  // Merge the deltas into the streamChunks
  setStreamChunks(nextChunks);
  return nextChunks;
}

function mergeChunks(
  streamMessages: StreamMessage[],
  streamChunks: Record<string, StreamDelta[]>,
  deltas: StreamDelta[]
): Record<string, StreamDelta[]> {
  const newChunks: Record<string, StreamDelta[]> = {};
  // Seed the existing chunks
  for (const { streamId } of streamMessages) {
    const chunks = streamChunks[streamId];
    if (chunks === undefined) {
      newChunks[streamId] = [];
    } else {
      newChunks[streamId] = chunks;
    }
  }
  let changed = false;
  for (const streamId of Object.keys(streamChunks)) {
    if (!newChunks[streamId]) {
      // There's a stream that's no longer active.
      changed = true;
    }
  }
  const sorted = deltas.sort((a, b) => a.start - b.start);
  for (const delta of sorted) {
    const existing = newChunks[delta.streamId];
    if (!existing) {
      console.warn(
        `Got delta for stream ${delta.streamId} that is no longer active`
      );
      continue;
    }
    const lastChunk = existing.at(-1);
    if (lastChunk && lastChunk.end !== delta.start) {
      if (lastChunk.end >= delta.end) {
        console.debug(
          `Got duplicate delta for stream ${delta.streamId} at ${delta.start}`
        );
        continue;
      } else if (lastChunk.end < delta.start) {
        console.warn(
          `Got delta for stream ${delta.streamId} that has a gap ${lastChunk.end} -> ${delta.start}`
        );
        continue;
      } else {
        throw new Error(`Got unexpected delta for stream ${delta.streamId}:
            delta: ${delta.start} -> ${delta.end}
            last chunk: ${lastChunk.start} -> ${lastChunk.end}
            `);
      }
    }
    changed = true;
    existing.push(delta);
  }
  if (!changed) return streamChunks;
  return newChunks;
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

// function createUIMessageFromPart(
//   part: StreamDelta,
//   metadata: {
//     id: string;
//     createdAt: Date;
//   }
// ): UIMessageOrdered{
//   switch (part.type) {
//     case "text-delta":
//       return {
//         ...metadata,
//         role: "assistant",
//         content: part.textDelta,
//         parts: [{ type: "text", text: part.textDelta }],
//       };
//     case "tool-call-streaming-start":
//       return {
//         ...metadata,
//         role: "assistant",
//         content: "",
//         parts: [
//           {
//             type: "tool-invocation",
//             toolInvocation: {
//               toolCallId: part.toolCallId,
//               toolName: part.toolName,
//               args: {},
//               state: "partial-call",
//             },
//           },
//         ],
//       };
//     case "reasoning":
//       return {
//         ...metadata,
//         role: "assistant",
//         content: "",
//         parts: [{ type: "reasoning", reasoning: part.textDelta, details: [] }],
//       };
//     case "source":
//       console.warn("Received source part first??");
//       return {
//         ...metadata,
//         role: "assistant",
//         content: "",
//         parts: [{ type: "source", source: part.source }],
//       };
//     case "tool-call":
//       console.warn("Received tool call part first??");
//       return {
//         ...metadata,
//         role: "assistant",
//         content: "",
//         parts: [
//           {
//             type: "tool-invocation",
//             toolInvocation: {
//               state: "call",
//               args: part.args,
//               toolCallId: part.toolCallId,
//               toolName: part.toolName,
//             },
//           },
//         ],
//       };
//     case "tool-call-delta":
//       console.warn("Received tool call delta part first??");
//       return {
//         ...metadata,
//         role: "assistant",
//         content: "",
//         parts: [{ type: "tool-invocation", toolInvocation: part.toolCall }],
//       };
//     default:
//       console.error(`Unexpected first part type: ${part.type}`);
//       return {
//         ...metadata,
//         role: "assistant",
//         content: "",
//         parts: [],
//         annotations: [part as JSONValue],
//       };
//   }
// }

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
    [threadId, token]
  );
  return [{ text, loading, error }, readStream] as const;
}
