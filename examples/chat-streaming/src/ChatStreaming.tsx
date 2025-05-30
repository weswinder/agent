import { useMutation, insertAtTop } from "convex/react";
import { Toaster } from "./components/ui/toaster";
import { api } from "../convex/_generated/api";
import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";
import { UIMessage } from "ai";
import { useEffect, useState } from "react";
import { OptimisticLocalStore } from "convex/browser";

export default function ChatStreaming() {
  const createThread = useMutation(api.streaming.createThread);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!threadId) void createThread().then(setThreadId);
  }, [createThread, threadId]);
  return (
    <>
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm p-4 flex justify-between items-center border-b">
        <h1 className="text-xl font-semibold accent-text">
          Streaming Chat Example
        </h1>
      </header>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <main className="flex-1 flex items-center justify-center p-8">
          {threadId ? (
            <>
              <Story
                threadId={threadId}
                reset={() => void createThread().then(setThreadId)}
              />
            </>
          ) : (
            <div className="text-center text-gray-500">Loading...</div>
          )}
        </main>
        <Toaster />
      </div>
    </>
  );
}

function Story({ threadId, reset }: { threadId: string; reset: () => void }) {
  const messages = useThreadMessages(
    api.streaming.listThreadMessages,
    { threadId },
    { initialNumItems: 10, stream: true },
  );
  const sendMessage = useMutation(
    api.streaming.streamStoryAsynchronously,
  ).withOptimisticUpdate(optimisticallySendMessage);
  const [prompt, setPrompt] = useState("");

  function onSendClicked() {
    if (prompt.trim() === "") return;
    void sendMessage({ threadId, prompt });
    setPrompt("");
  }

  return (
    <>
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6 flex flex-col gap-6">
        {messages.results?.length > 0 && (
          <div className="flex flex-col gap-4 overflow-y-auto mb-4">
            {toUIMessages(messages.results ?? []).map((m, i) => (
              <Message key={i} m={m} />
            ))}
          </div>
        )}
        <form
          className="flex gap-2 items-center"
          onSubmit={(e) => {
            e.preventDefault();
            onSendClicked();
          }}
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
            placeholder={
              messages.results?.length > 0
                ? "Continue the story..."
                : "Tell me a story..."
            }
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-semibold disabled:opacity-50"
            disabled={!prompt.trim()}
          >
            Send
          </button>
          {messages.results?.length > 0 && (
            <button
              className="px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition font-medium self-end"
              onClick={() => reset()}
            >
              Reset
            </button>
          )}
        </form>
      </div>
    </>
  );
}

function Message({ m }: { m: UIMessage }) {
  const isUser = m.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-lg px-4 py-2 max-w-xs whitespace-pre-wrap shadow-sm ${
          isUser ? "bg-blue-100 text-blue-900" : "bg-gray-200 text-gray-800"
        }`}
      >
        {m.content}
      </div>
    </div>
  );
}

// TODO: make this into a helper that takes in the api reference to a thread
// query and a function that turns the args for a given mutation into
// { threadId, prompt } and returns the args for the mutation.
function optimisticallySendMessage(
  store: OptimisticLocalStore,
  args: { threadId: string; prompt: string },
) {
  const queries = store.getAllQueries(api.streaming.listThreadMessages);
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
    paginatedQuery: api.streaming.listThreadMessages,
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
}
