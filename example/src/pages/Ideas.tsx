import { usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";

export function Ideas() {
  const {
    results: ideas,
    loadMore,
    status,
  } = usePaginatedQuery(api.ideas.listIdeas, {}, { initialNumItems: 12 });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ideas.map((idea) => (
          <Link
            key={idea._id}
            to={`/ideas/${idea._id}`}
            className="block p-6 rounded-lg border hover:border-indigo-500 transition-colors"
          >
            <h3 className="text-xl font-semibold mb-2">{idea.title}</h3>
            <div className="prose line-clamp-3">
              <ReactMarkdown>{idea.summary}</ReactMarkdown>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {idea.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
      {status === "CanLoadMore" && (
        <button
          onClick={() => loadMore(12)}
          className="mt-8 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Load More
        </button>
      )}
    </div>
  );
}
