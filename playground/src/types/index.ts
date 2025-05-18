import { MessageDoc, ThreadDoc } from "@convex-dev/agent";
import { CoreMessage } from "ai";

export interface User {
  _id: string;
  name: string;
}

export type Thread = ThreadDoc & {
  latestMessage?: string;
  lastMessageAt?: number;
};

export interface ToolCall {
  id: string;
  type: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  returnValue?: any;
}

export type Message = MessageDoc;

export type ContextMessage = CoreMessage & {
  vectorSearchRank?: number;
  textSearchRank?: number;
  hybridSearchRank?: number;
};
