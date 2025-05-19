
import React, { useMemo, useState } from "react";
import MessageItem from "./MessageItem";
import { Message, User } from "../types";
import { toUIMessages } from "@convex-dev/agent";

interface MessageListProps {
  users: User[];
  messages: Message[];
  selectedMessageId: string | undefined;
  onSelectMessage: (messageId: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  users,
  messages,
  selectedMessageId,
  onSelectMessage,
}) => {
  const [selectedToolCallId, setSelectedToolCallId] = useState<string | null>(
    null
  );
  const uiMessages = useMemo(() => {
    const uiMessages = toUIMessages([...messages].reverse());
    return uiMessages.map((uiMessage) => {
      const message =
        messages.find((message) => message._id === uiMessage.id) ??
        messages.find((m) => m.id === uiMessage.id)!;
      uiMessage.id = message._id;
      return {
        ...message,
        message: uiMessage,
      };
    });
  }, [messages]);

  const handleSelectToolCall = (toolCallId: string) => {
    setSelectedToolCallId(
      selectedToolCallId === toolCallId ? null : toolCallId
    );
  };

  return (
    <div className="flex flex-col min-h-0 h-full overflow-y-auto">
      {uiMessages.map((message) => (
        <MessageItem
          key={message._id}
          user={users.find((user) => user._id === message.userId)}
          message={message}
          isSelected={message._id === selectedMessageId}
          onClick={() => {
            onSelectMessage(message._id);
            setSelectedToolCallId(null);
          }}
          onSelectToolCall={handleSelectToolCall}
          selectedToolCallId={selectedToolCallId}
        />
      ))}
    </div>
  );
};

export default MessageList;
