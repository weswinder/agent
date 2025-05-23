import { usePaginatedQuery } from "convex/react";
import { useMutation } from "convex/react";
import { Toaster } from "./components/ui/toaster";
import { api } from "../convex/_generated/api";
import { toUIMessages, useStreamMessagesQuery } from "@convex-dev/agent/react";
import { UIMessage } from "ai";
import { useState } from "react";

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
  const messages = usePaginatedQuery(
    api.chat.listMessages,
    { threadId },
    { initialNumItems: 10 },
  );
  const sendMessage = useMutation(api.chat.streamStoryInternalAction);

  function onSendClicked() {
    void sendMessage({ threadId, prompt, stream: true });
    // TODO: .withOptimisticUpdate(... patch messages);
  }

  return (
    <>
      {toUIMessages(messages.results ?? []).map((m) => (
        <Message m={m} />
      ))}
      <StreamedMessages threadId={threadId} />
      <button onClick={onSendClicked}>Send</button>
    </>
  );
}

function Message({ m }: { m: UIMessage }) {
  return (
    <pre className="whitespace-pre-wrap">{JSON.stringify(m, null, 2)}</pre>
  );
}
// A separate component helps avoid re-rendering all messages when only the streaming ones are changing
function StreamedMessages({ threadId }: { threadId: string }) {
  const streamedMessages = useStreamMessagesQuery(
    api.chat.streamMessageDeltas,
    { threadId }, // other parameters can be passed
  );
  return <>{streamedMessages?.map((m) => <Message m={m} />)}</>;
}
