import { useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import ReactMarkdown from "react-markdown";

export function Home() {
  const [content, setContent] = useState("");
  const createEntry = useMutation(api.ideas.createEntry);
  const entries = usePaginatedQuery(
    api.ideas.listEntries,
    {},
    { initialNumItems: 50 },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    await createEntry({
      title: content.split("\n")[0] || "Untitled",
      content,
      source: "chat",
    });
    setContent("");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col gap-12">
        <form onSubmit={void handleSubmit} className="sticky top-24">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-6 rounded-xl border-2 border-indigo-100 min-h-[60vh] text-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-lg"
              placeholder="Write your thoughts..."
            />
            <button
              type="submit"
              disabled={!content.trim()}
              className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-b-xl font-medium text-lg hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:hover:from-indigo-600 disabled:hover:to-purple-600 transition-all shadow-inner flex items-center justify-center gap-2"
            >
              <span>Capture Thought</span>
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

        <div className="space-y-6">
          {entries.results.map((entry) => (
            <div
              key={entry._id}
              className="p-6 rounded-xl border border-indigo-100 shadow-sm"
            >
              <h3 className="font-semibold mb-3 text-xl text-indigo-900">
                {entry.title}
              </h3>
              <div className="prose prose-indigo max-w-none">
                <ReactMarkdown>{entry.content}</ReactMarkdown>
              </div>
              <div className="text-sm text-indigo-500/70 mt-4">
                {new Date(entry._creationTime).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
