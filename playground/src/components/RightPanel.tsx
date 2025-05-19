import React, { useState } from "react";
import { Message, ContextMessage } from "../types";
import MessageComposer from "./MessageComposer";
import ContextMessages from "./ContextMessages";
import { ContextOptions, StorageOptions } from "@convex-dev/agent";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import CollapsibleSection from "./CollapsibleSection";
import JsonEditor from "./JsonEditor";

interface RightPanelProps {
  selectedMessage: Message | null;
  agents: string[] | undefined;
  contextMessages: ContextMessage[];
  onSendMessage: (
    message: string,
    agentName: string,
    context: ContextOptions,
    storage: StorageOptions
  ) => Promise<string>;
  selectedAgentName?: string;
  setSelectedAgentName: (name: string) => void;
  fetchContextMessages: (contextOptions: ContextOptions) => Promise<void>;
}

// TODO: store preferences in local storage
const DEFAULT_CONTEXT_OPTIONS: ContextOptions = {
  recentMessages: 10,
  excludeToolMessages: true,
  searchOtherThreads: false,
  searchOptions: {
    limit: 0,
    textSearch: true,
    vectorSearch: true,
    messageRange: { before: 2, after: 1 },
  },
};

const RightPanel: React.FC<RightPanelProps> = ({
  selectedMessage,
  agents,
  contextMessages,
  onSendMessage,
  selectedAgentName,
  setSelectedAgentName,
  fetchContextMessages,
}) => {
  const [contextOptions, setContextOptions] = useState<ContextOptions>(
    DEFAULT_CONTEXT_OPTIONS
  );
  const [isFetchingContext, setIsFetchingContext] = useState(false);

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
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Select Agent
              </label>
              <Select
                value={selectedAgentName || ""}
                onValueChange={setSelectedAgentName}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents?.map((agent) => (
                    <SelectItem key={agent} value={agent}>
                      {agent}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Context Options
              </label>
              <CollapsibleSection title="Context Options">
                <JsonEditor
                  initialValue={contextOptions}
                  onChange={setContextOptions}
                />
              </CollapsibleSection>

              {/* For now, just a button to fetch context with current options */}
              <Button
                className="w-full"
                onClick={() => {
                  setIsFetchingContext(true);
                  fetchContextMessages(contextOptions).finally(() => {
                    setIsFetchingContext(false);
                  });
                }}
                disabled={isFetchingContext || !selectedAgentName}
              >
                {isFetchingContext
                  ? "Fetching Context..."
                  : "Fetch Context Messages"}
              </Button>
            </div>
            {contextMessages.length > 0 && (
              <div className="mb-4">
                <ContextMessages messages={contextMessages} />
              </div>
            )}
            <div>
              <MessageComposer
                agentName={selectedAgentName}
                onSendMessage={onSendMessage}
                contextOptions={contextOptions}
              />
            </div>
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
