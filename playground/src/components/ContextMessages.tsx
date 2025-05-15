import React from "react";
import { ContextMessage } from "../types";
import { Check } from "lucide-react";

interface ContextMessagesProps {
  messages: ContextMessage[];
}

const ContextMessages: React.FC<ContextMessagesProps> = ({ messages }) => {
  return (
    <div className="mt-4">
      <h3 className="font-medium mb-2">Context Messages</h3>

      {messages.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No context messages available.
        </p>
      ) : (
        <div className="border rounded-md">
          {/* Column Headers */}
          <div className="p-3 flex items-start gap-3 border-b bg-muted/50">
            <div className="flex-shrink-0 w-24 text-left">
              <span className="text-xs font-medium">Vector Search</span>
              <br />
              <span className="text-xs font-medium">(Rank)</span>
            </div>

            <div className="flex-grow text-center self-end">Message Text</div>

            <div className="flex-shrink-0 w-24 text-right">
              <span className="text-xs font-medium">Text Search</span>
              <br />
              <span className="text-xs font-medium">(Rank)</span>
            </div>
          </div>

          {/* Message rows */}
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`p-3 flex items-center gap-3 ${
                index < messages.length - 1 ? "border-b" : ""
              }`}
            >
              <div className="flex-shrink-0 w-6 text-center">
                {message.vectorSearchRank !== undefined && (
                  <div className="flex flex-col ">
                    <span className="search-rank vector-rank">
                      {message.vectorSearchRank}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-grow">{message.content}</div>

              <div className="flex-shrink-0 w-6 text-center">
                {message.textSearchRank !== undefined && (
                  <div className="flex flex-col">
                    <span className="search-rank text-rank">
                      {message.textSearchRank}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContextMessages;
