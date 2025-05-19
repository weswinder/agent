import { useState, useCallback, useEffect } from "react";
import LeftPanel from "@/components/LeftPanel";
import MiddlePanel from "@/components/MiddlePanel";
import RightPanel from "@/components/RightPanel";
import { useToast } from "@/components/ui/use-toast";
import { usePaginatedQuery, useQuery, useAction } from "convex/react";
import type { PlaygroundAPI } from "@convex-dev/agent/playground";
import { ContextMessage, Thread } from "@/types";
import { ContextOptions, StorageOptions } from "@convex-dev/agent";

interface IndexProps {
  apiKey: string;
  api: PlaygroundAPI;
}

const Index = ({ apiKey, api }: IndexProps) => {
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

  // Convex hooks
  const users = usePaginatedQuery(
    api.listUsers,
    { apiKey },
    { initialNumItems: 20 }
  );
  useEffect(() => {
    if (users.results.length > 0 && !selectedUserId) {
      setSelectedUserId(users.results[0]._id);
    }
  }, [users.results, selectedUserId]);

  const threads = usePaginatedQuery(
    api.listThreads,
    selectedUserId ? { apiKey, userId: selectedUserId } : "skip",
    { initialNumItems: 20 }
  );
  useEffect(() => {
    if (threads.results.length > 0 && !selectedThreadId) {
      setSelectedThreadId(threads.results[0]._id);
    }
  }, [threads.results, selectedThreadId]);

  const messages = usePaginatedQuery(
    api.listMessages,
    selectedThreadId ? { apiKey, threadId: selectedThreadId } : "skip",
    { initialNumItems: 20 }
  );
  useEffect(() => {
    if (messages.results.length > 0 && !selectedMessageId) {
      setSelectedMessageId(messages.results[0].id);
    }
  }, [messages.results, selectedMessageId]);

  const agents = useQuery(api.listAgents, { apiKey });
  useEffect(() => {
    if (agents && agents.length > 0 && !selectedAgentName) {
      setSelectedAgentName(agents[0]);
    }
  }, [agents, selectedAgentName]);

  // Convex actions
  const generateText = useAction(api.generateText);
  const fetchPromptContext = useAction(api.fetchPromptContext);

  // Selected thread and message
  const selectedThread = threads.results.find(
    (thread) => thread._id === selectedThreadId
  );
  const selectedMessage = messages.results.find(
    (message) => message._id === selectedMessageId
  );

  // Handlers
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
    const message = messages.results.find((m) => m._id === messageId);
    if (message && selectedAgentName !== message?.agentName) {
      setSelectedAgentName(message?.agentName);
    }
  };

  // Fetch context messages
  const fetchContextMessages = useCallback(
    async (contextOptions: ContextOptions) => {
      if (!selectedMessage || !selectedAgentName) {
        toast({ title: "Select a message and agent first" });
        return;
      }
      try {
        const context = await fetchPromptContext({
          apiKey,
          agentName: selectedAgentName,
          threadId: selectedThreadId,
          userId: selectedUserId,
          messages: [selectedMessage.message],
          contextOptions,
          beforeMessageId: selectedMessage._id,
        });
        setContextMessages(context);
      } catch (err) {
        toast({ title: "Failed to fetch context", description: String(err) });
      }
    },
    [
      apiKey,
      fetchPromptContext,
      selectedMessage,
      selectedAgentName,
      selectedThreadId,
      selectedUserId,
      toast,
    ]
  );

  // Send message
  const handleSendMessage = async (
    message: string,
    agentName: string,
    context: ContextOptions,
    storage: StorageOptions
  ) => {
    if (!selectedThreadId || !selectedUserId) {
      toast({ title: "Select a thread and user first" });
      return;
    }
    try {
      const result = await generateText({
        apiKey,
        agentName,
        threadId: selectedThreadId,
        userId: selectedUserId,
        prompt: message,
        contextOptions: context,
        storageOptions: storage,
      });
      toast({
        title: "Message sent",
        description: result.text,
      });
      // Optionally, refresh messages or update UI here
    } catch (err) {
      toast({ title: "Failed to send message", description: String(err) });
    }
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
            selectedAgentName={selectedAgentName}
            setSelectedAgentName={setSelectedAgentName}
            fetchContextMessages={fetchContextMessages}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
