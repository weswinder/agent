import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CollapsibleSection from "./CollapsibleSection";
import JsonEditor from "./JsonEditor";
import { ContextOptions, StorageOptions } from "@convex-dev/agent";
import { toast } from "sonner";

const DEFAULT_STORAGE_OPTIONS: StorageOptions = {
  saveAllInputMessages: false,
  saveAnyInputMessages: true,
  saveOutputMessages: true,
};

interface MessageComposerProps {
  agentName?: string;
  onSendMessage: (
    message: string,
    agentName: string,
    context: ContextOptions,
    storage: StorageOptions
  ) => Promise<string>;
  contextOptions: ContextOptions;
}

const MessageComposer: React.FC<MessageComposerProps> = ({
  agentName,
  onSendMessage,
  contextOptions,
}) => {
  const [message, setMessage] = useState("");
  const [storageOptions, setStorageOptions] = useState<StorageOptions>(
    DEFAULT_STORAGE_OPTIONS
  );
  const [response, setResponse] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const handleSend = () => {
    if (!message.trim() || !agentName) {
      toast.error("Please enter a message and select an agent");
      return;
    }
    setIsSendingMessage(true);
    onSendMessage(message, agentName, contextOptions, storageOptions)
      .then((text) => setResponse(text))
      .finally(() => {
        setIsSendingMessage(false);
      });
    setResponse(
      "Thank you for your message. The agent is processing your request..."
    );
  };

  return (
    <>
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
        disabled={!message.trim() || !agentName || isSendingMessage}
        title={
          !message.trim()
            ? "Please enter a message"
            : !agentName
              ? "Please select an agent"
              : isSendingMessage
                ? "Sending..."
                : "Send Message"
        }
      >
        {isSendingMessage ? "Sending..." : "Send Message"}
      </Button>
      {response && (
        <div className="border rounded-md p-3 bg-muted/50">
          <h3 className="font-medium mb-2 text-sm">Response:</h3>
          <p className="text-sm">{response}</p>
        </div>
      )}
    </>
  );
};

export default MessageComposer;
