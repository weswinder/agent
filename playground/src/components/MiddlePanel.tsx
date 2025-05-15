
import React from 'react';
import MessageList from './MessageList';
import { Message } from '../types';

interface MiddlePanelProps {
  messages: Message[];
  selectedMessageId: string | null;
  onSelectMessage: (messageId: string) => void;
  selectedThreadTitle?: string;
}

const MiddlePanel: React.FC<MiddlePanelProps> = ({ 
  messages, 
  selectedMessageId, 
  onSelectMessage,
  selectedThreadTitle
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">
        <h2 className="font-medium">
          {selectedThreadTitle || "Select a thread"}
        </h2>
      </div>
      
      <div className="panel-content">
        {messages.length > 0 ? (
          <MessageList 
            messages={messages}
            selectedMessageId={selectedMessageId}
            onSelectMessage={onSelectMessage}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a thread to view messages
          </div>
        )}
      </div>
    </div>
  );
};

export default MiddlePanel;
