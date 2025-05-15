
export interface User {
  id: string;
  name: string;
}

export interface Thread {
  id: string;
  userId: string;
  title: string;
  subtitle: string;
  latestMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToolCall {
  id: string;
  type: string;
  name: string;
  args: Record<string, any>;
  returnValue?: any;
}

export interface Message {
  id: string;
  threadId: string;
  content: string;
  role: "user" | "agent";
  sender: string;
  timestamp: string;
  generationTime?: number;
  toolCalls?: ToolCall[];
  contentType: "text" | "image";
  imageUrl?: string;
}

export interface ContextMessage {
  id: string;
  content: string;
  vectorSearchRank?: number;
  textSearchRank?: number;
}

export interface Agent {
  id: string;
  name: string;
}
