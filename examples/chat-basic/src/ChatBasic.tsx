import { useMutation, useQuery } from "convex/react";
import { Toaster } from "./components/ui/toaster";
import { api } from "../convex/_generated/api";
import {
  optimisticallySendMessage,
  toUIMessages,
  useThreadMessages,
  type UIMessage,
} from "@convex-dev/agent/react";
import { useCallback, useEffect, useState } from "react";

function getThreadIdFromHash() {
  return window.location.hash.replace(/^#/, "") || undefined;
}

export default function ChatBasic() {
  const createThread = useMutation(api.chatBasic.createNewThread);
  const [threadId, setThreadId] = useState<string | undefined>(
    typeof window !== "undefined" ? getThreadIdFromHash() : undefined,
  );

  // Fetch thread title if threadId exists
  const threadDetails = useQuery(
    api.chatBasic.getThreadDetails,
    threadId ? { threadId } : "skip",
  );

  // Listen for hash changes
  useEffect(() => {
    function onHashChange() {
      setThreadId(getThreadIdFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Reset handler: create a new thread and update hash
  const newThread = useCallback(() => {
    void createThread({ title: "Fresh thread" }).then((newId) => {
      window.location.hash = newId;
      setThreadId(newId);
    });
  }, [createThread]);

  // On mount or when threadId changes, if no threadId, create one and set hash
  useEffect(() => {
    if (!threadId) newThread();
  }, [newThread, threadId]);

  return (
    <>
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm p-4 flex justify-between items-center border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold accent-text">
            Basic Chat Example
          </h1>
          {threadId && threadDetails && threadDetails.title && (
            <span
              className="text-gray-500 text-base font-normal truncate max-w-xs"
              title={threadDetails.title}
            >
              &mdash; {threadDetails.title}
            </span>
          )}
        </div>
        <button
          onClick={newThread}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          type="button"
        >
          <span className="text-lg">+</span>
          <span>New Thread</span>
        </button>
      </header>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <main className="flex-1 flex items-center justify-center p-8">
          {threadId ? (
            <>
              <Chat threadId={threadId} />
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

function Chat({ threadId }: { threadId: string }) {
  const messages = useThreadMessages(
    api.chatBasic.listThreadMessages,
    { threadId },
    { initialNumItems: 10 },
  );
  const sendMessage = useMutation(
    api.chatBasic.sendMessage,
  ).withOptimisticUpdate(
    optimisticallySendMessage(api.chatBasic.listThreadMessages),
  );
  const [prompt, setPrompt] = useState("Yo yo yo");

  function onSendClicked() {
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt === "") return;
    void sendMessage({ threadId, prompt: trimmedPrompt }).catch(() =>
      setPrompt(prompt),
    );
    setPrompt("");
  }

  return (
    <>
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6 flex flex-col gap-6">
        {messages.results?.length > 0 && (
          <div className="flex flex-col gap-4 overflow-y-auto mb-4">
            {toUIMessages(messages.results ?? []).map((m) => (
              <Message key={m.key} message={m} />
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
            placeholder="Ask me anything..."
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-semibold disabled:opacity-50"
            disabled={!prompt.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </>
  );
}

function Message({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-lg px-4 py-2 max-w-lg whitespace-pre-wrap shadow-sm ${
          isUser ? "bg-blue-100 text-blue-900" : "bg-gray-200 text-gray-800"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
