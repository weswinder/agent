import { useAction, useMutation } from "convex/react";
import { Toaster } from "./components/ui/toaster";
import { api } from "../convex/_generated/api";
import {
  optimisticallySendMessage,
  toUIMessages,
  useSmoothText,
  useThreadMessages,
  type UIMessage,
} from "@convex-dev/agent/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "./hooks/use-toast";

function getThreadIdFromHash() {
  return window.location.hash.replace(/^#/, "") || undefined;
}

export default function Example() {
  const uploadFile = useAction(api.filesImages.uploadFile);
  const [question, setQuestion] = useState("");

  const [threadId, setThreadId] = useState<string | undefined>(
    typeof window !== "undefined" ? getThreadIdFromHash() : undefined,
  );
  const submitFileQuestion = useMutation(
    api.filesImages.submitFileQuestion,
  ).withOptimisticUpdate((store, args) => {
    if (!threadId) return;
    optimisticallySendMessage(api.filesImages.listThreadMessages)(store, {
      prompt: args.question,
      threadId,
    });
  });
  const [file, setFile] = useState<{ fileId: string; url: string } | undefined>(
    undefined,
  );
  const messages = useThreadMessages(
    api.filesImages.listThreadMessages,
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

  // window.location.hash = newId;
  const handleFileUpload = useCallback(
    async (file: File) => {
      const { fileId, url } = await uploadFile({
        bytes: await file.arrayBuffer(),
        filename: file.name,
        mimeType: file.type,
      });
      setFile({ fileId, url });
    },
    [uploadFile],
  );

  const handleSubmitFileQuestion = useCallback(
    async (question: string) => {
      if (!file?.fileId) throw new Error("No file selected");
      setQuestion("");
      await submitFileQuestion({
        fileId: file?.fileId,
        question,
      })
        .then(({ threadId }) => {
          setThreadId(threadId);
          window.location.hash = threadId;
        })
        .catch((e) => {
          toast({
            title: "Failed to submit question",
            description: e.message,
          });
          setQuestion((q) => q || question);
        });
    },
    [submitFileQuestion, file?.fileId],
  );

  return (
    <>
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm p-4 flex justify-between items-center border-b">
        <h1 className="text-xl font-semibold accent-text">
          Files and Images Example
        </h1>
      </header>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <main className="flex-1 flex items-center justify-center p-8">
          {file && (
            <div className="flex flex-col gap-2">
              <img src={file.url} alt={file.fileId} />
            </div>
          )}
          <form
            className="flex gap-2 items-center"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmitFileQuestion(question);
            }}
          >
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileUpload(file);
              }}
            />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
              placeholder="Ask a question about the file"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-semibold disabled:opacity-50"
              disabled={!file?.fileId || !question.trim()}
            >
              Send
            </button>
          </form>
          {messages.results?.length > 0 && (
            <>
              <div className="flex flex-col gap-4 overflow-y-auto mb-4">
                {toUIMessages(messages.results ?? []).map((m) => (
                  <Message key={m.key} message={m} />
                ))}
              </div>
              <button
                className="px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition font-medium self-end"
                onClick={() => {
                  setThreadId(undefined);
                  setFile(undefined);
                }}
                type="button"
              >
                Reset
              </button>
            </>
          )}
        </main>
        <Toaster />
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
        {message.parts.map((part, i) => {
          const key = message.key + i;
          switch (part.type) {
            case "text":
              return <div key={key}>{part.text}</div>;
            case "file":
              if (part.mimeType.startsWith("image/")) {
                return <img key={key} src={part.data} />;
              }
              return (
                <a key={key} href={part.data}>
                  {"📎"}File
                </a>
              );
            case "reasoning":
              return <div key={key}>{part.reasoning}</div>;
            case "tool-invocation":
              return <div key={key}>{part.toolInvocation.toolName}</div>;
            case "source":
              return (
                <a key={key} href={part.source.url}>
                  {part.source.title ?? part.source.url}
                </a>
              );
          }
        })}
      </div>
    </div>
  );
}
