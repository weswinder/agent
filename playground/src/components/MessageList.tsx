
import React, { useState } from 'react';
import MessageItem from './MessageItem';
import { Message } from '../types';

interface MessageListProps {
  messages: Message[];
  selectedMessageId: string | null;
  onSelectMessage: (messageId: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  selectedMessageId, 
  onSelectMessage
}) => {
  const [selectedToolCallId, setSelectedToolCallId] = useState<string | null>(null);
  
  const handleSelectToolCall = (toolCallId: string) => {
    setSelectedToolCallId(selectedToolCallId === toolCallId ? null : toolCallId);
  };
  
  return (
    <div className="flex flex-col min-h-0 h-full overflow-y-auto">
      {messages.map(message => (
        <MessageItem 
          key={message.id} 
          message={message}
          isSelected={message.id === selectedMessageId}
          onClick={() => {
            onSelectMessage(message.id);
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
