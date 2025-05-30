import {
  FunctionArgs,
  FunctionReference,
  PaginationOptions,
  PaginationResult,
} from "convex/server";
import { useState, useMemo } from "react";
import { StreamArgs, StreamCursor, StreamSyncReturns } from "../validators";
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
import { MessageDoc } from "../client";

export { toUIMessages, type UIMessageOrdered };


// export function useThreadUIMessages<Query extends ThreadStreamQuery>(
//   query: Query,
//   args: ThreadUIMessagesArgs<Query>,
//   options: {
//     initialNumItems?: number;
//     stream: true;
//   }
// ): UsePaginatedQueryResult<
//   UIMessageOrdered & { order: number; stepOrder: number }
// >;
// export function useThreadUIMessages<Query extends ThreadQuery>(
//   query: Query,
//   args: ThreadUIMessagesArgs<Query>,
//   options: {
//     initialNumItems?: number;
//     stream?: false;
//   }
// ): UsePaginatedQueryResult<
//   UIMessageOrdered & { order: number; stepOrder: number }
// >;
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
      : ErrorMessage<"To enable streaming, your query must take in streamArgs">;
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
  const [messages, setMessages] = useState<StreamsChunk[] | undefined>(
    undefined
  );
  const listArgs =
    args === "skip"
      ? args
      : ({
          ...args,
          paginationOpts: { cursor: null, numItems: 0 },
          streamArgs: { kind: "list" } as StreamArgs,
        } as FunctionArgs<Query>);
  const streamList = useQuery(query, listArgs);
  // const cursorQuery = useQuery(query, {
  //   kind: "deltas",
  //   cursors: messages?.map((m) => m.cursor) ?? [],
  // } satisfies StreamArgs);
  // TODO: state machine doing delta syncing
  return undefined;
}

type MessagesPage = {
  // refers to the message "order"
  start: number; // inclusive
  end: number; // exclusive
  messages: StreamDelta[];
};

type StreamDelta = Extract<
  TextStreamPart<ToolSet>,
  {
    type:
      | "text-delta"
      | "reasoning"
      | "source"
      | "tool-call"
      | "tool-call-streaming-start"
      | "tool-call-delta"
      | "tool-result";
  }
>;

type StreamsChunk = StreamCursor & {
  order: number;
  stepOrder: number;
  // the range represented by this chunk
  continueCursor: number; // exclusive
  deltas: StreamDelta[];
  isDone: boolean;
};

export type ThreadQueryReturns<M extends MessageDoc> = {
  streamChunks?: StreamsChunk[];
} & PaginationResult<M>;

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
  PaginationResult<M> & { streams?: StreamSyncReturns }
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
  PaginationResult<M> & { streams: StreamSyncReturns }
>;

type ThreadMessagesArgs<Query extends ThreadQuery<unknown, MessageDoc>> =
  Query extends ThreadQuery<unknown, MessageDoc>
    ? Expand<BetterOmit<FunctionArgs<Query>, "paginationOpts" | "streamArgs">>
    : never;

type ThreadMessagesResult<Query extends ThreadQuery<unknown, MessageDoc>> =
  Query extends ThreadQuery<unknown, infer M> ? M : never;

function chunksToMessages(chunks: StreamsChunk[] | undefined): MessageDoc[] {
  // TODO:
  return [];
}

// TODO: pass in the messages we need to watch? that way it can be consistent..
// export function useStreamMessagesQuery<Query extends StreamQuery>(
//   query: Query,
//   args: StreamArgs,
// ): Array<UIMessageOrdered> | undefined {
//   const [messages, setMessages] = useState<StreamsChunk[] | undefined>(
//     undefined
//   );
//   const originalArgs = args[0] === "skip" ? args : args[0] ?? {};
//   const argsWithStreamArgs = useMemo(
//     () =>
//       args[0] === "skip" || !messages
//         ? args
//         : ({
//             ...originalArgs,
//             streamArgs: messages.map(chunkCursor),
//           } as FunctionArgs<Query>),
//     [messages]
//   );
//   const results = useQuery(
//     query,
//     ...([argsWithStreamArgs] as OptionalRestArgs<Query>)
//   );
//   // const [isDone, setIsDone] = useState(false);
//   useEffect(() => {
//     if (!results) return;
//     const newMessages = results.messages.map(chunkCursor);
//     let matches = messages && newMessages.length === messages.length;
//     if (matches) {
//       for (let i = 0; i < newMessages.length; i++) {
//         const newMessage = newMessages[i];
//         const oldMessage = messages![i];
//         if (
//           !Object.is(newMessage.cursor, oldMessage.cursor) &&
//           (newMessage.cursor !== oldMessage.cursor ||
//             newMessage.key !== oldMessage.key)
//         ) {
//           matches = false;
//           break;
//         }
//       }
//     }
//     if (!matches) {
//       setMessages(
//         results.messages.map((result) => {
//           const existingMessage = messages?.find((m) => m.key === result.key);
//           if (existingMessage && existingMessage.cursor === result.cursor) {
//             return existingMessage;
//           }
//           const existingDeltas = existingMessage?.deltas ?? [];
//           return {
//             key: result.key,
//             cursor: result.cursor,
//             deltas: [...existingDeltas, ...result.deltas],
//           };
//         })
//       );
//     }
//   }, [results]);
//   const keyOrder = useMemo(() => {
//     return results?.messages.map((m) => m.key) ?? [];
//   }, [results]);
//   const uiMessages = useMemo(() => {
//     return messages
//       ? streamMessagesToUIMessages(messages, keyOrder)
//       : undefined;
//   }, [messages, JSON.stringify(keyOrder)]);
//   return uiMessages;
// }

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

// function chunkCursor({ start, end, key }: StreamsChunk): Cursor {
//   return { start, end, key };
// }

if (typeof window === "undefined") {
  throw new Error("this is frontend code, but it's running somewhere else!");
}
// type StreamQuery<Args = unknown> = FunctionReference<
//   "query",
//   "public",
//   { threadId: string; streamArgs: StreamArgs } & Args,
//   ThreadQueryReturns<MessageDoc>
// >;

// export type StreamPartialArgs<Query extends StreamQuery> =
//   | BetterOmit<FunctionArgs<Query>, "streamArgs">
//   | "skip";

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
