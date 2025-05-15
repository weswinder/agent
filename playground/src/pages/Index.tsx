
import React, { useState, useMemo } from 'react';
import LeftPanel from '@/components/LeftPanel';
import MiddlePanel from '@/components/MiddlePanel';
import RightPanel from '@/components/RightPanel';
import { useToast } from "@/components/ui/use-toast";
import { agents, contextMessages, messages, threads, users } from '@/data/mockData';

const Index = () => {
  const { toast } = useToast();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const selectedThread = useMemo(() => {
    if (!selectedThreadId) return null;
    return threads.find((thread) => thread.id === selectedThreadId) || null;
  }, [selectedThreadId]);

  const threadMessages = useMemo(() => {
    if (!selectedThreadId) return [];
    return messages[selectedThreadId] || [];
  }, [selectedThreadId]);

  const selectedMessage = useMemo(() => {
    if (!selectedMessageId || !threadMessages.length) return null;
    return (
      threadMessages.find((message) => message.id === selectedMessageId) || null
    );
  }, [selectedMessageId, threadMessages]);

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    setSelectedMessageId(null);
  };

  const handleSelectMessage = (messageId: string) => {
    setSelectedMessageId(messageId);
  };

  const handleSendMessage = (
    message: string,
    agentId: string,
    context: any,
    storage: any
  ) => {
    console.log("Sending message:", message);
    console.log("Agent:", agentId);
    console.log("Context options:", context);
    console.log("Storage options:", storage);

    toast({
      title: "Message sent",
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
            users={users}
            threads={threads}
            selectedThreadId={selectedThreadId}
            onSelectThread={handleSelectThread}
          />
        </div>

        <div className="w-1/2 h-full border-x">
          <MiddlePanel
            messages={threadMessages}
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
