import React, { useState, useMemo, useCallback } from "react";
import LeftPanel from "@/components/LeftPanel";
import MiddlePanel from "@/components/MiddlePanel";
import RightPanel from "@/components/RightPanel";
import { useToast } from "@/components/ui/use-toast";
import { usePaginatedQuery, useQuery, useAction } from "convex/react";
import { assert } from "convex-helpers";
import type { PlaygroundAPI } from "@convex-dev/agent/playground";
import { anyApi } from "convex/server";
import { CoreMessage } from "ai";
import { ContextMessage, Thread } from "@/types";
import { ContextOptions, StorageOptions } from "@convex-dev/agent";

const api = (import.meta.env.VITE_PLAYGROUND_API_PATH as string)
  .trim()
  .split("/")
  .reduce((acc, part) => acc[part], anyApi) as unknown as PlaygroundAPI;

// TODO: have a UI to set the API key
const apiKey = import.meta.env.VITE_PLAYGROUND_API_KEY!;
assert(apiKey, "VITE_PLAYGROUND_API_KEY is not set");

const Index = () => {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [selectedThreadId, setSelectedThreadId] = useState<
    string | undefined
  >();
  const [selectedMessageId, setSelectedMessageId] = useState<
    string | undefined
  >();
  const [selectedAgentName, setSelectedAgentName] = useState<
    string | undefined
  >();
  const [contextMessages, setContextMessages] = useState<ContextMessage[]>([]);

  // Users
  const users = usePaginatedQuery(
    api.listUsers,
    { apiKey },
    { initialNumItems: 20 }
  );
  React.useEffect(() => {
    if (users.results.length > 0 && !selectedUserId) {
      setSelectedUserId(users.results[0]._id);
    }
  }, [users.results, selectedUserId]);

  // Threads
  const threads = usePaginatedQuery(
    api.listThreads,
    selectedUserId ? { apiKey, userId: selectedUserId } : "skip",
    { initialNumItems: 20 }
  );
  React.useEffect(() => {
    if (threads.results.length > 0 && !selectedThreadId) {
      setSelectedThreadId(threads.results[0]._id);
    }
  }, [threads.results, selectedThreadId]);

  // Messages
  const messages = usePaginatedQuery(
    api.listMessages,
    selectedThreadId ? { apiKey, threadId: selectedThreadId } : "skip",
    { initialNumItems: 20 }
  );
  React.useEffect(() => {
    if (messages.results.length > 0 && !selectedMessageId) {
      setSelectedMessageId(messages.results[0].id);
    }
  }, [messages.results, selectedMessageId]);

  // Agents
  const agents = useQuery(api.listAgents, { apiKey }) || [];

  // Selected thread and message
  const selectedThread = threads.results.find(
    (thread) => thread._id === selectedThreadId
  );

  const selectedMessage = messages.results.find(
    (message) => message._id === selectedMessageId
  );

  // Context fetch (stub for now)
  // const fetchContext = useAction(api.fetchPromptContext);
  // const fetchContextMessages = useCallback(async () => { ... });

  const handleSelectUserId = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedThreadId(undefined);
    setSelectedMessageId(undefined);
  };

  const handleSelectThread = (thread: Thread) => {
    setSelectedThreadId(thread._id);
    setSelectedMessageId(undefined);
  };

  const handleSelectMessage = (messageId: string) => {
    setSelectedMessageId(messageId);
  };

  const handleSendMessage = (
    message: string,
    agentName: string,
    context: ContextOptions,
    storage: StorageOptions
  ) => {
    console.log("Sending message:", message);
    console.log("Agent:", agentName);
    console.log("Context options:", context);
    console.log("Storage options:", storage);

    toast({
      title: "(TODO) Message sent",
      description: "Your message has been sent to the agent.",
    });
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-secondary p-3 border-b">
        <h1 className="font-bold text-lg">Playground</h1>
      </div>

      <div className="flex-grow flex overflow-hidden">
        <div className="w-1/4 h-full">
          <LeftPanel
            users={users.results}
            threads={threads.results}
            selectedUserId={selectedUserId}
            selectedThreadId={selectedThreadId}
            onSelectUserId={handleSelectUserId}
            onSelectThread={handleSelectThread}
            onLoadMoreThreads={threads.loadMore}
            canLoadMoreThreads={threads.status === "CanLoadMore"}
          />
        </div>

        <div className="w-1/2 h-full border-x">
          <MiddlePanel
            users={users.results}
            messages={messages.results}
            selectedMessageId={selectedMessageId}
            onSelectMessage={handleSelectMessage}
            selectedThreadTitle={selectedThread?.title}
          />
        </div>

        <div className="w-1/4 h-full">
          <RightPanel
            selectedMessage={selectedMessage}
            agents={agents}
            contextMessages={contextMessages}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
