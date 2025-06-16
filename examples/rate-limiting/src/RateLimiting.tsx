import { useMutation } from "convex/react";
import { Toaster } from "./components/ui/toaster";
import { api } from "../convex/_generated/api";
import {
  optimisticallySendMessage,
  toUIMessages,
  useThreadMessages,
  type UIMessage,
} from "@convex-dev/agent/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "./hooks/use-toast";
import { isRateLimitError } from "@convex-dev/rate-limiter";
import { useRateLimit } from "@convex-dev/rate-limiter/react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

function getThreadIdFromHash() {
  return window.location.hash.replace(/^#/, "") || undefined;
}

export default function Example() {
  const [question, setQuestion] = useState("What's 1+1?");
  const { status } = useRateLimit(api.rateLimiting.getRateLimit, {
    getServerTimeMutation: api.rateLimiting.getServerTime,
  });
  const [threadId, setThreadId] = useState<string | undefined>(
    typeof window !== "undefined" ? getThreadIdFromHash() : undefined,
  );
  const submitQuestion = useMutation(
    api.rateLimiting.submitQuestion,
  ).withOptimisticUpdate((store, args) => {
    if (!threadId) return;
    optimisticallySendMessage(api.rateLimiting.listThreadMessages)(store, {
      prompt: args.question,
      threadId,
    });
  });
  const messages = useThreadMessages(
    api.rateLimiting.listThreadMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 10 },
  );

  // Listen for hash changes
  useEffect(() => {
    function onHashChange() {
      setThreadId(getThreadIdFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleSubmitQuestion = useCallback(
    async (question: string) => {
      setQuestion("why?");
      await submitQuestion({ question, threadId })
        .then(({ threadId: newThreadId }) => {
          if (threadId !== newThreadId) {
            setThreadId(newThreadId);
            window.location.hash = newThreadId;
          }
        })
        .catch((e) => {
          if (isRateLimitError(e)) {
            // Ideally we never get here unless they're over token usage, since
            // we have the query on rate limit status. however there can be
            // network latency races.
            toast({
              title: "Rate limit exceeded",
              description: `Rate limit exceeded for ${e.data.name}.
              Try again after ${dayjs(Date.now() + e.data.retryAfter).fromNow()}`,
            });
            setQuestion((q) => q || question);
          } else {
            toast({
              title: "Failed to submit question",
              description: e.message,
            });
            setQuestion((q) => q || question);
          }
        });
    },
    [submitQuestion, threadId],
  );

  return (
    <>
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm p-4 flex justify-between items-center border-b">
        <h1 className="text-xl font-semibold accent-text">
          Rate Limiting Example
        </h1>
      </header>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-6 bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Rate Limited Chat
              </h2>
              <p className="text-gray-600 text-sm">
                This demo shows rate limiting in action. You can send 1 message
                per 5 seconds and use up to 1000 tokens per minute.
              </p>
            </div>
            {/* Chat Messages */}
            {messages.results?.length > 0 && (
              <>
                <div className="w-full flex flex-col gap-4 overflow-y-auto mb-6 px-2">
                  {toUIMessages(messages.results ?? []).map((m) => (
                    <Message key={m.key} message={m} />
                  ))}
                </div>
              </>
            )}
            <>
              <form
                className="w-full flex flex-col gap-4 items-center"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSubmitQuestion(question);
                }}
              >
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 text-lg"
                  placeholder="Ask me anything..."
                />
                {status && !status.ok && (
                  <div className="text-xs text-gray-500 text-center">
                    <p>Rate limit exceeded.</p>
                    <p>Try again after {dayjs(status.retryAt).fromNow()}</p>
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-semibold text-lg disabled:opacity-50"
                  disabled={!question.trim() || !status?.ok}
                >
                  Send
                </button>
              </form>
              {messages.results?.length > 0 && (
                <button
                  className="w-full px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition font-medium mt-2"
                  onClick={() => {
                    setThreadId(undefined);
                    setQuestion("What is the meaning of life?");
                    window.location.hash = "";
                  }}
                  type="button"
                >
                  Start over
                </button>
              )}
              <div className="text-xs text-gray-500 text-center">
                <p>Rate limits:</p>
                <p>• 1 message per 5 seconds</p>
                <p>• 1000 tokens per minute</p>
              </div>
            </>
          </div>
        </main>
        <Toaster />
      </div>
    </>
  );
}

function Message({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} w-full`}>
      <div
        className={`rounded-2xl px-5 py-3 max-w-[75%] whitespace-pre-wrap shadow-md text-base break-words border ${
          isUser
            ? "bg-blue-100 text-blue-900 border-blue-200"
            : "bg-gray-100 text-gray-800 border-gray-200"
        }`}
      >
        {message.parts.map((part, i) => {
          const key = message.key + i;
          switch (part.type) {
            case "text":
              return <div key={key}>{part.text}</div>;
            case "file":
              if (part.mimeType.startsWith("image/")) {
                return (
                  <img
                    key={key}
                    src={part.data}
                    className="max-h-40 rounded-lg mt-2 border border-gray-300 shadow"
                  />
                );
              }
              return (
                <a
                  key={key}
                  href={part.data}
                  className="text-blue-600 underline"
                >
                  {"📎"}File
                </a>
              );
            case "reasoning":
              return (
                <div key={key} className="italic text-gray-500">
                  {part.reasoning}
                </div>
              );
            case "tool-invocation":
              return (
                <div key={key} className="text-xs text-gray-400">
                  {part.toolInvocation.toolName}
                </div>
              );
            case "source":
              return (
                <a
                  key={key}
                  href={part.source.url}
                  className="text-blue-500 underline"
                >
                  {part.source.title ?? part.source.url}
                </a>
              );
          }
        })}
      </div>
    </div>
  );
}
