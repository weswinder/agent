import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard!",
      duration: 2000,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Agent Playground</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A powerful playground for experimenting with{" "}
            <a
              href="https://convex.dev/components/agent"
              className="text-blue-500"
            >
              @convex-dev/agent
            </a>
            . Test your agents, browse threads, and explore message interactions
            in real-time.
          </p>
          <Button
            size="lg"
            className="mt-8 text-lg px-8"
            onClick={() => navigate("/play")}
          >
            Launch Playground
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Thread Management</h3>
            <p className="text-muted-foreground">
              Browse and manage user threads with ease
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Message Analysis</h3>
            <p className="text-muted-foreground">
              View detailed message metadata and tool call information
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Context Experimentation</h3>
            <p className="text-muted-foreground">
              Test different context options and message interactions
            </p>
          </Card>
        </div>

        {/* Big image link to /screenshot.png */}
        <div className="max-w-6xl mx-auto">
          <img
            src="/screenshot.png"
            alt="Agent Playground"
            className="w-full h-auto"
          />
        </div>

        {/* Installation Instructions */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Getting Started</h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">1. Install the Package</h3>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>npm i @convex-dev/agent-playground</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() =>
                    copyToClipboard("npm i @convex-dev/agent-playground")
                  }
                >
                  Copy
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">
                2. Set Up Your Playground API
              </h3>
              <p className="text-muted-foreground mb-2">
                Create a new file <code>convex/playground.ts</code> with:
              </p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>{`import { definePlaygroundAPI } from "@convex-dev/agent-playground";
import { components } from "./_generated/api";
import { weatherAgent, fashionAgent } from "./example";

export const {
  isApiKeyValid,
  listAgents,
  listUsers,
  listThreads,
  listMessages,
  createThread,
  generateText,
  fetchPromptContext,
} = definePlaygroundAPI(components.agent, {
  agents: [weatherAgent, fashionAgent],
});`}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() =>
                    copyToClipboard(`import { definePlaygroundAPI } from "@convex-dev/agent-playground";
import { components } from "./_generated/api";
import { weatherAgent, fashionAgent } from "./example";

export const {
  isApiKeyValid,
  listAgents,
  listUsers,
  listThreads,
  listMessages,
  createThread,
  generateText,
  fetchPromptContext,
} = definePlaygroundAPI(components.agent, {
  agents: [weatherAgent, fashionAgent],
});`)
                  }
                >
                  Copy
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Generate an API Key</h3>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>
                    npx convex run --component agent apiKeys:issue{" "}
                    {`'{name: "my key"}'`}
                  </code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() =>
                    copyToClipboard(
                      `npx convex run --component agent apiKeys:issue {name: "my key"}`
                    )
                  }
                >
                  Copy
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. Launch the Playground</h3>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>npx @convex-dev/agent-playground</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() =>
                    copyToClipboard("npx @convex-dev/agent-playground")
                  }
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Button
              size="lg"
              className="text-lg px-8"
              onClick={() => navigate("/play")}
            >
              Try the Playground Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
