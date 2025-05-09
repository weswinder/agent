import { useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Editor from "@monaco-editor/react";
import { Button } from "./components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";

dayjs.extend(relativeTime);

interface User {
  id: string;
  name: string;
}

interface Agent {
  id: string;
  name: string;
}

interface Tool {
  id: string;
  name: string;
  description: string;
}

interface Thread {
  id: string;
  title: string;
  subtitle: string;
  latestMessage: string;
  createdAt: string;
  lastMessageAt: string;
}

interface Message {
  id: string;
  content: string;
  type: "text" | "tool_call" | "tool_response";
  sender: {
    type: "user" | "bot" | "system";
    name: string;
  };
  timestamp: string;
  duration: number;
  toolCall?: {
    tool: string;
    args: Record<string, unknown>;
  };
  toolResponse?: {
    tool: string;
    result: Record<string, unknown>;
  };
}

interface ContextMessage {
  id: string;
  content: string;
  vectorSearchRank: number | null;
  textSearchRank: number | null;
}

// Example data
const USERS: User[] = [
  { id: "1", name: "Alice Johnson" },
  { id: "2", name: "Bob Smith" },
];

const AGENTS: Agent[] = [
  { id: "1", name: "Sales Assistant" },
  { id: "2", name: "Support Agent" },
];

const TOOLS: Tool[] = [
  { id: "getPricing", name: "Get Pricing", description: "Fetch product pricing" },
  { id: "getFeatures", name: "Get Features", description: "List product features" },
];

const THREADS: Thread[] = [
  {
    id: "1",
    title: "Product Inquiry",
    subtitle: "Discussion about pricing",
    latestMessage: "Thank you for the information",
    createdAt: "2024-03-18T10:00:00",
    lastMessageAt: "2024-03-18T11:30:00",
  },
];

const DEFAULT_CONTEXT_OPTIONS = {
  maxMessages: 10,
  includeSystemMessages: true,
  temperature: 0.7,
};

const DEFAULT_STORAGE_OPTIONS = {
  ttl: 3600,
  cacheKey: "default",
};

const MESSAGES: Message[] = [
  {
    id: "1",
    content: "Hi, I need help with pricing",
    type: "text",
    sender: { type: "user", name: "Alice Johnson" },
    timestamp: "2024-03-18T10:00:00",
    duration: 0,
  },
  {
    id: "2",
    content: "Let me check the pricing for you",
    type: "tool_call",
    sender: { type: "bot", name: "Sales Assistant" },
    timestamp: "2024-03-18T10:01:00",
    duration: 0.5,
    toolCall: {
      tool: "getPricing",
      args: { product: "enterprise" },
    },
  },
  {
    id: "3",
    content: "Here's the pricing information",
    type: "tool_response",
    sender: { type: "system", name: "Tool Response" },
    timestamp: "2024-03-18T10:01:01",
    duration: 0,
    toolResponse: {
      tool: "getPricing",
      result: { price: 999, currency: "USD" },
    },
  },
];

const CONTEXT_MESSAGES: ContextMessage[] = [
  {
    id: "1",
    content: "Previous pricing discussion",
    vectorSearchRank: 1,
    textSearchRank: 2,
  },
  {
    id: "2",
    content: "Product features overview",
    vectorSearchRank: 2,
    textSearchRank: null,
  },
  {
    id: "3",
    content: "Customer preferences",
    vectorSearchRank: null,
    textSearchRank: 1,
  },
];

export default function App() {
  const [selectedUser, setSelectedUser] = useState<string>();
  const [selectedThread, setSelectedThread] = useState<string>();
  const [selectedAgent, setSelectedAgent] = useState<string>();
  const [selectedTool, setSelectedTool] = useState<string>();
  const [selectedMessage, setSelectedMessage] = useState<Message>(MESSAGES[0]);
  const [newMessage, setNewMessage] = useState("");
  const [contextOptions, setContextOptions] = useState(
    JSON.stringify(DEFAULT_CONTEXT_OPTIONS, null, 2)
  );
  const [storageOptions, setStorageOptions] = useState(
    JSON.stringify(DEFAULT_STORAGE_OPTIONS, null, 2)
  );

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="w-80 border-r p-4 flex flex-col bg-white">
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Select a user" />
          </SelectTrigger>
          <SelectContent>
            {USERS.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="mt-4 flex-1 overflow-auto">
          {THREADS.map((thread) => (
            <div
              key={thread.id}
              className={`p-3 cursor-pointer hover:bg-gray-50 ${
                selectedThread === thread.id ? "bg-gray-100" : "bg-white"
              }`}
              onClick={() => setSelectedThread(thread.id)}
            >
              <div className="font-medium">{thread.title}</div>
              <div className="text-sm text-gray-600">{thread.subtitle}</div>
              <div className="text-sm text-gray-400 truncate">
                {thread.latestMessage}
              </div>
              <div className="text-xs text-gray-400 mt-1 flex justify-between">
                <span>Created {dayjs(thread.createdAt).fromNow()}</span>
                <span>Last message {dayjs(thread.lastMessageAt).fromNow()}</span>
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" className="mt-4">
          Load More
        </Button>
      </div>

      {/* Middle Panel */}
      <div className="flex-1 p-4 border-r overflow-auto bg-gray-50">
        <div className="flex flex-col space-y-4">
          {MESSAGES.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col rounded-lg bg-white p-4 shadow-sm cursor-pointer ${
                selectedMessage?.id === message.id ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => setSelectedMessage(message)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`${
                      message.sender.type === "user"
                        ? "bg-blue-100 text-blue-800"
                        : message.sender.type === "bot"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    } px-2 py-1 rounded-full text-sm`}
                  >
                    {message.sender.type === "user"
                      ? "👤"
                      : message.sender.type === "bot"
                      ? "🤖"
                      : "⚙️"}{" "}
                    {message.sender.name}
                  </span>
                  {message.type === "tool_call" && (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm">
                      🧰 Tool Call
                    </span>
                  )}
                  {message.type === "tool_response" && (
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm">
                      📦 Tool Response
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-400">
                  {message.duration}s
                </span>
              </div>

              <div className="mt-2">{message.content}</div>

              {message.toolCall && (
                <div className="mt-2 pl-4 border-l-2 border-yellow-200">
                  <div className="text-sm text-gray-600">
                    <div className="font-medium">Tool: {message.toolCall.tool}</div>
                    <div className="font-mono bg-gray-50 p-2 mt-1 rounded">
                      {JSON.stringify(message.toolCall.args, null, 2)}
                    </div>
                  </div>
                </div>
              )}

              {message.toolResponse && (
                <div className="mt-2 pl-4 border-l-2 border-purple-200">
                  <div className="text-sm text-gray-600">
                    <div className="font-medium">
                      Response from: {message.toolResponse.tool}
                    </div>
                    <div className="font-mono bg-gray-50 p-2 mt-1 rounded">
                      {JSON.stringify(message.toolResponse.result, null, 2)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-96 p-4 flex flex-col gap-4 overflow-auto bg-white">
        {/* Selected Message JSON */}
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-2">Selected Message</h3>
          <div className="h-48">
            <Editor
              height="100%"
              defaultLanguage="json"
              value={JSON.stringify(selectedMessage, null, 2)}
              options={{
                minimap: { enabled: false },
                readOnly: true,
                fontSize: 12,
              }}
            />
          </div>
        </div>

        {/* New Message Section */}
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-2">New Message</h3>
          
          <div className="space-y-4">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                {AGENTS.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTool} onValueChange={setSelectedTool}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select a tool (optional)" />
              </SelectTrigger>
              <SelectContent>
                {TOOLS.map((tool) => (
                  <SelectItem key={tool.id} value={tool.id}>
                    <div>
                      <div>{tool.name}</div>
                      <div className="text-xs text-gray-500">{tool.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <details>
              <summary className="cursor-pointer font-medium">Context Options</summary>
              <div className="mt-2 h-32">
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  value={contextOptions}
                  onChange={(value) => setContextOptions(value || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                  }}
                />
              </div>
            </details>

            <details>
              <summary className="cursor-pointer font-medium">Storage Options</summary>
              <div className="mt-2 h-32">
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  value={storageOptions}
                  onChange={(value) => setStorageOptions(value || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                  }}
                />
              </div>
            </details>

            <textarea
              className="w-full h-32 p-2 border rounded bg-white"
              placeholder="Enter your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />

            <Button className="w-full">Send Message</Button>
          </div>

          <div className="mt-4 p-2 bg-gray-50 rounded">
            <h4 className="font-medium mb-2">Latest Response</h4>
            <p className="text-sm text-gray-600">No response yet</p>
          </div>
        </div>

        {/* Context Messages */}
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-2">Context Messages</h3>
          <div className="space-y-2">
            {CONTEXT_MESSAGES.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2 text-sm">
                <div className="w-20 flex-shrink-0">
                  {msg.vectorSearchRank !== null && (
                    <span className="text-green-600">
                      ✓ ({msg.vectorSearchRank})
                    </span>
                  )}
                </div>
                <div className="flex-1">{msg.content}</div>
                <div className="w-20 flex-shrink-0 text-right">
                  {msg.textSearchRank !== null && (
                    <span className="text-blue-600">
                      ✓ ({msg.textSearchRank})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
