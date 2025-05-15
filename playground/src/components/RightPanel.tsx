
import React from 'react';
import { Message, Agent, ContextMessage } from '../types';
import MessageComposer from './MessageComposer';
import ContextMessages from './ContextMessages';

interface RightPanelProps {
  selectedMessage: Message | null;
  agents: Agent[];
  contextMessages: ContextMessage[];
  onSendMessage: (message: string, agentId: string, context: any, storage: any) => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ 
  selectedMessage, 
  agents,
  contextMessages,
  onSendMessage
}) => {
  return (
    <div className="flex flex-col h-full border-l">
      <div className="panel-header">
        <h2 className="font-medium">Message Details</h2>
      </div>
      
      <div className="panel-content p-4 overflow-y-auto">
        {selectedMessage ? (
          <>
            <div className="mb-6">
              <h3 className="font-medium mb-2">Message JSON</h3>
              <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-xs">
                {JSON.stringify(selectedMessage, null, 2)}
              </pre>
            </div>
            
            <MessageComposer 
              agents={agents}
              onSendMessage={onSendMessage}
            />
            
            <ContextMessages 
              messages={contextMessages}
            />
          </>
        ) : (
          <div className="text-muted-foreground">
            Select a message to view details
          </div>
        )}
      </div>
    </div>
  );
};

export default RightPanel;
