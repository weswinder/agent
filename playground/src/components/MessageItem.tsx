import React, { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Message } from "../types";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Bot, User, Wrench } from "lucide-react";

interface MessageItemProps {
  message: Message;
  isSelected: boolean;
  onClick: () => void;
  onSelectToolCall?: (toolCallId: string) => void;
  selectedToolCallId?: string | null;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isSelected,
  onClick,
  onSelectToolCall,
  selectedToolCallId,
}) => {
  const [expandedToolCall, setExpandedToolCall] = useState<string | null>(null);

  const messageDate = new Date(message.timestamp);
  const relativeTime = formatDistanceToNow(messageDate, { addSuffix: true });

  const toggleToolCall = (toolCallId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedToolCall(expandedToolCall === toolCallId ? null : toolCallId);
  };

  return (
    <div
      className={`p-4 border-b cursor-pointer ${
        isSelected ? "bg-secondary" : "hover:bg-muted/50"
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {message.role === "user" ? (
            <>
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User size={14} />
              </div>
              <span className="font-medium">{message.sender}</span>
            </>
          ) : (
            <>
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-ai text-white">
                <Bot size={14} />
              </div>
              <span className="font-medium text-ai">{message.sender}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{relativeTime}</span>
          {message.generationTime && (
            <span className="bg-secondary px-2 py-0.5 rounded-full">
              {message.generationTime.toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      {message.contentType === "text" ? (
        <div
          className={
            message.role === "user"
              ? "message-bubble-user"
              : "message-bubble-agent"
          }
        >
          {message.content.split("\n").map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      ) : (
        <div className="mt-2">
          <img
            src={message.imageUrl}
            alt="Message content"
            className="rounded-lg max-w-full max-h-[300px]"
          />
        </div>
      )}

      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="ml-6 mt-2">
          {message.toolCalls.map((toolCall) => {
            const isToolCallExpanded = expandedToolCall === toolCall.id;
            return (
              <div
                key={toolCall.id}
                className={`tool-call-bubble mt-2 ${
                  isToolCallExpanded
                    ? "bg-secondary border border-primary/30 rounded-lg"
                    : ""
                }`}
              >
                <div
                  className="flex items-center gap-2 p-2 cursor-pointer"
                  onClick={(e) => toggleToolCall(toolCall.id, e)}
                >
                  <div className="w-5 h-5 flex items-center justify-center rounded-full bg-muted-foreground text-muted">
                    <Wrench size={12} />
                  </div>
                  <span className="font-medium text-sm">{toolCall.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-5 w-5 ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleToolCall(toolCall.id, e);
                    }}
                  >
                    {isToolCallExpanded ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </Button>
                </div>
                {isToolCallExpanded && (
                  <div className="mt-2 text-sm p-2">
                    <div className="mb-2">
                      <div className="font-medium mb-1">Arguments:</div>
                      <pre className="bg-secondary p-2 rounded-md overflow-x-auto text-xs">
                        {JSON.stringify(toolCall.args, null, 2)}
                      </pre>
                    </div>
                    {toolCall.returnValue && (
                      <div>
                        <div className="font-medium mb-1">Return Value:</div>
                        <pre className="bg-secondary p-2 rounded-md overflow-x-auto text-xs">
                          {JSON.stringify(toolCall.returnValue, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MessageItem;
