
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import CollapsibleSection from './CollapsibleSection';
import JsonEditor from './JsonEditor';
import { ContextOptions, StorageOptions } from "../../../dist/esm/client";

const DEFAULT_CONTEXT_OPTIONS: ContextOptions = {
  recentMessages: 10,
  includeToolCalls: false,
  searchOtherThreads: false,
  searchOptions: {
    limit: 10,
    textSearch: true,
    vectorSearch: true,
    messageRange: { before: 0, after: 0 },
  },
};

const DEFAULT_STORAGE_OPTIONS: StorageOptions = {
  saveAllInputMessages: false,
  saveAnyInputMessages: true,
  saveOutputMessages: true,
};

interface MessageComposerProps {
  agents: string[];
  onSendMessage: (
    message: string,
    agentName: string,
    context: ContextOptions,
    storage: StorageOptions
  ) => void;
}

const MessageComposer: React.FC<MessageComposerProps> = ({ agents, onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [selectedAgentName, setSelectedAgentName] = useState<string>(
    agents[0] || ""
  );
  const [contextOptions, setContextOptions] = useState<ContextOptions>(
    DEFAULT_CONTEXT_OPTIONS
  );
  const [storageOptions, setStorageOptions] = useState<StorageOptions>(
    DEFAULT_STORAGE_OPTIONS
  );
  const [response, setResponse] = useState<string | null>(null);

  const handleSend = () => {
    if (!message.trim() || !selectedAgentName) return;

    onSendMessage(message, selectedAgentName, contextOptions, storageOptions);
    setResponse(
      "Thank you for your message. The agent is processing your request..."
    );

    // In a real app, this would be replaced with the actual response
    setTimeout(() => {
      setResponse(
        "I've analyzed your request and found some relevant information. Based on the context provided, I can suggest several approaches to solve this problem..."
      );
    }, 1500);

    setMessage("");
  };

  return (
    <div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Select Agent</label>
        <Select
          value={selectedAgentName}
          onValueChange={(value) => setSelectedAgentName(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select an agent" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((agent) => (
              <SelectItem key={agent} value={agent}>
                {agent}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CollapsibleSection title="Context Options">
        <JsonEditor
          initialValue={contextOptions}
          onChange={setContextOptions}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Storage Options">
        <JsonEditor
          initialValue={storageOptions}
          onChange={setStorageOptions}
        />
      </CollapsibleSection>

      <div className="mb-4">
        <Textarea
          placeholder="Type your message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[100px]"
        />
      </div>

      <Button
        className="w-full mb-4"
        onClick={handleSend}
        disabled={!message.trim() || !selectedAgentName}
      >
        Send Message
      </Button>

      {response && (
        <div className="border rounded-md p-3 bg-muted/50">
          <h3 className="font-medium mb-2 text-sm">Response:</h3>
          <p className="text-sm">{response}</p>
        </div>
      )}
    </div>
  );
};

export default MessageComposer;
