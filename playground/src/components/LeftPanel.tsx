
import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ThreadList from './ThreadList';
import { Thread, User } from '../types';

interface LeftPanelProps {
  users: User[];
  threads: Thread[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({ 
  users, 
  threads, 
  selectedThreadId, 
  onSelectThread 
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(users[0]?.id || null);
  
  const filteredThreads = useMemo(() => {
    if (!selectedUserId) return [];
    return threads.filter(thread => thread.userId === selectedUserId);
  }, [threads, selectedUserId]);
  
  const handleLoadMore = () => {
    console.log("Loading more threads...");
    // In a real implementation, this would load more threads from an API
  };
  
  return (
    <div className="flex flex-col h-full border-r">
      <div className="panel-header">
        <Select
          value={selectedUserId || undefined}
          onValueChange={(value) => setSelectedUserId(value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a user" />
          </SelectTrigger>
          <SelectContent>
            {users.map(user => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="panel-content">
        <ThreadList 
          threads={filteredThreads}
          selectedThreadId={selectedThreadId}
          onSelectThread={onSelectThread}
          onLoadMore={handleLoadMore}
        />
      </div>
    </div>
  );
};

export default LeftPanel;
