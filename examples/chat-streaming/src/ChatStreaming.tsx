import { useMutation, insertAtTop } from "convex/react";
import { Toaster } from "./components/ui/toaster";
import { api } from "../convex/_generated/api";
import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react";
import { UIMessage } from "ai";
import { useState } from "react";
import { OptimisticLocalStore } from "convex/browser";

export default function ChatStreaming() {
  const createThread = useMutation(api.chat.createThread);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  return (
    <>
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm p-4 flex justify-between items-center border-b">
        <h1 className="text-xl font-semibold accent-text">
          Streaming Chat Example
        </h1>
      </header>
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 p-8">
          {threadId ? (
            <>
              <Story threadId={threadId} />
              <button onClick={() => void createThread().then(setThreadId)}>
                Restart
              </button>
            </>
          ) : (
            <button onClick={() => void createThread().then(setThreadId)}>
              Create thread
            </button>
          )}
        </main>
        <Toaster />
      </div>
    </>
  );
}

function Story({ threadId }: { threadId: string }) {
  const messages = useThreadMessages(
    api.chat.listThreadMessages,
    { threadId },
    { initialNumItems: 10, stream: true },
  );
  const sendMessage = useMutation(
    api.chat.streamStoryAsynchronously,
  ).withOptimisticUpdate(optimisticallySendMessage);
  const [prompt, setPrompt] = useState("");

  function onSendClicked() {
    void sendMessage({ threadId, prompt });
  }

  return (
    <>
      {toUIMessages(messages.results ?? []).map((m) => (
        <Message m={m} />
      ))}

      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button onClick={onSendClicked}>Send</button>
    </>
  );
}

function Message({ m }: { m: UIMessage }) {
  return (
    <pre className="whitespace-pre-wrap">{JSON.stringify(m, null, 2)}</pre>
  );
}

function optimisticallySendMessage(
  store: OptimisticLocalStore,
  args: { threadId: string; prompt: string },
) {
  const queries = store.getAllQueries(api.chat.listThreadMessages);
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
    paginatedQuery: api.chat.listThreadMessages,
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
