import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CollapsibleSection from "./CollapsibleSection";
import JsonEditor from "./JsonEditor";
import {
  ContextOptions,
  StorageOptions,
  vContextOptions,
  vStorageOptions,
} from "@convex-dev/agent";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Agent } from "@/types";

interface MessageComposerProps {
  agents: Agent[] | undefined;
  selectedAgent: Agent | undefined;
  setSelectedAgent: (agent: Agent) => void;
  contextOptions: ContextOptions;
  setContextOptions: (contextOptions: ContextOptions) => void;
  storageOptions: StorageOptions;
  setStorageOptions: (storageOptions: StorageOptions) => void;
  onSendMessage: (
    message: string,
    agentName: string,
    context: ContextOptions | undefined,
    storage: StorageOptions | undefined
  ) => Promise<string | undefined>;
}

const MessageComposer: React.FC<MessageComposerProps> = ({
  agents,
  selectedAgent,
  setSelectedAgent,
  contextOptions,
  setContextOptions,
  storageOptions,
  setStorageOptions,
  onSendMessage,
}) => {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const handleSend = () => {
    if (!message.trim() || !selectedAgent) {
      toast.error("Please enter a message and select an agent");
      return Promise.reject();
    }
    setIsSendingMessage(true);
    setResponse(
      "Thank you for your message. The agent is processing your request..."
    );
    return onSendMessage(
      message,
      selectedAgent.name,
      contextOptions,
      storageOptions
    )
      .then((text) =>
        setResponse(storageOptions.saveOutputMessages ? null : text ?? null)
      )
      .finally(() => {
        setIsSendingMessage(false);
      });
  };
  console.log({ agents, selectedAgent });

  return (
    <>
      <div className="flex flex-row gap-4 ">
        <div className="mb-4 flex-shrink-0">
          <label className="block text-sm font-medium mb-1">Select Agent</label>
          <Select
            value={selectedAgent?.name || ""}
            onValueChange={(value) => {
              const agent = agents?.find((a) => a.name === value);
              if (agent) {
                setSelectedAgent(agent);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
              {agents?.map((agent) => (
                <SelectItem key={agent.name} value={agent.name}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mb-4 w-full">
          <Textarea
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend().then(() => {
                  setMessage("");
                });
              }
            }}
            className="min-h-[100px]"
          />
        </div>
        <Button
          className="mb-4"
          onClick={handleSend}
          disabled={!message.trim() || !selectedAgent || isSendingMessage}
          title={
            !message.trim()
              ? "Please enter a message"
              : !selectedAgent
                ? "Please select an agent"
                : isSendingMessage
                  ? "Sending..."
                  : "Send Message"
          }
        >
          {isSendingMessage ? "Sending..." : "Send Message"}
        </Button>
      </div>
      {response && (
        <div className="border rounded-md p-3 bg-muted/50">
          <h3 className="font-medium mb-2 text-sm">Response:</h3>
          <p className="text-sm">{response}</p>
        </div>
      )}
      <CollapsibleSection title="Context & Storage Options">
        <div className="flex flex-row gap-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium mb-1">
              Context Options
            </label>
            <JsonEditor
              initialValue={contextOptions}
              onChange={setContextOptions}
              validator={vContextOptions}
            />
          </div>
          <div className="w-1/2">
            <label className="block text-sm font-medium mb-1">
              Storage Options
            </label>
            <JsonEditor
              initialValue={storageOptions}
              onChange={setStorageOptions}
              validator={vStorageOptions}
            />
          </div>
        </div>
      </CollapsibleSection>
    </>
  );
};

export default MessageComposer;
