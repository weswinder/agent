import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ThreadList from "./ThreadList";
import { Thread, User } from "../types";
import { Button } from "./ui/button";

interface LeftPanelProps {
  users: User[];
  threads: Thread[];
  selectedUserId?: string;
  selectedThreadId?: string;
  onSelectUserId: (userId: string) => void;
  onSelectThread: (thread: Thread) => void;
  onLoadMoreThreads: (numItems: number) => void;
  canLoadMoreThreads: boolean;
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  users,
  threads,
  selectedUserId,
  selectedThreadId,
  onSelectUserId,
  onSelectThread,
  onLoadMoreThreads,
  canLoadMoreThreads,
}) => {
  return (
    <div className="flex flex-col h-full border-r">
      <div className="panel-header">
        <Select
          value={selectedUserId || undefined}
          onValueChange={(value) => onSelectUserId(value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a user" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user._id} value={user._id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="panel-content">
        <ThreadList
          threads={threads}
          selectedThreadId={selectedThreadId}
          onSelectThread={onSelectThread}
          onLoadMore={() => onLoadMoreThreads(10)}
        />
        {canLoadMoreThreads && (
          <Button variant="outline" onClick={() => onLoadMoreThreads(10)}>
            Load More
          </Button>
        )}
      </div>
    </div>
  );
};

export default LeftPanel;
