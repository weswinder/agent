import { useState } from "react";
import { useAction, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import ReactMarkdown from "react-markdown";
import { useStreamingText } from "@convex-dev/agent/react";
const userId = "test_user"; // You'd use auth to access this on the server in a real app

export function Home() {
  const [content, setContent] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const threads = usePaginatedQuery(
    api.example.getThreads,
    { userId },
    { initialNumItems: 10 },
  );
  const inProgressMessages = useQuery(api.ideaAgents.inProgressMessages, {
    userId,
  });
  const messages = usePaginatedQuery(
    api.example.getThreadMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 10 },
  );
  const getWeather = useAction(api.example.createThread);
  const getOutfit = useAction(api.example.continueThread);
  const [followUpContent, setFollowUpContent] = useState("");
  // const token = useAuthToken();
  const [{ text, loading }, submitFollowUp] = useStreamingText(
    import.meta.env.VITE_CONVEX_URL.replace(".cloud", ".site") + "/streamText",
    threadId,
  );
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    void getWeather({
      userId,
      location: content,
    }).then(({ threadId, text }) => {
      console.log("got weather", text);
      setThreadId(threadId);
      void getOutfit({ threadId }).then(({ text }) => {
        console.log("got outfit", text);
      });
    });
    setContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col gap-12">
        <div className="max-w-lg mx-auto w-full">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
                onKeyDown={handleKeyDown}
                className="w-full min-h-[4rem] max-h-[70vh] p-4 pb-16 rounded-xl border-2 border-indigo-100 text-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-lg overflow-hidden"
                placeholder="Write your thoughts..."
              />
              <button
                type="submit"
                disabled={!content.trim()}
                className="absolute bottom-2 left-2 right-2 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium text-lg hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:hover:from-indigo-600 disabled:hover:to-purple-600 transition-all shadow-inner flex items-center justify-center gap-2"
              >
                <span>Get Outfit For Location</span>
                {content.trim() && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
        <div className="space-y-6">
          {[...messages.results].reverse().map((message) => (
            <div
              key={message._id}
              className="p-6 rounded-xl border border-indigo-100 shadow-sm"
            >
              <div className="prose prose-lg prose-indigo max-w-none prose-p:mt-2 prose-p:mb-2">
                <ReactMarkdown>{message.text}</ReactMarkdown>
              </div>
              <div className="text-sm text-indigo-500/70 mt-4">
                {new Date(message._creationTime).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
        <h2>In Progress</h2>
        {inProgressMessages && (
          <div>
            {inProgressMessages.map((message) => (
              <div key={"pending-" + message.id}>{message.text}</div>
            ))}
          </div>
        )}
        <h2>Follow-up questions</h2>
        {loading && text && <div>{text}</div>}
        {messages.results.find((m) => m.agentName === "Fashion Agent") && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const prompt = followUpContent;
              setFollowUpContent("");
              void submitFollowUp(prompt).catch(() => {
                setFollowUpContent(prompt);
              });
            }}
          >
            <textarea
              value={followUpContent}
              onChange={(e) => {
                setFollowUpContent(e.target.value);
              }}
            />
            <button type="submit">Submit</button>
          </form>
        )}
      </div>
      <h2>Threads</h2>
      {[...threads.results].reverse().map((thread) => (
        <div key={thread._id}>
          <button
            className="p-4 rounded-lg border hover:border-indigo-500"
            onClick={() => setThreadId(thread._id)}
          >
            <h3>{thread.title}</h3>
            <p>{thread.summary}</p>
            <p>{thread.status}</p>
            <p>{thread.userId}</p>
            <p>{new Date(thread._creationTime).toLocaleString()}</p>
          </button>
        </div>
      ))}
    </div>
  );
}
