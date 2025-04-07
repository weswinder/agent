# Convex Agent Component

[![npm version](https://badge.fury.io/js/@convex-dev%2fagent.svg)](https://badge.fury.io/js/@convex-dev%2fagent)

<!-- START: Include on https://convex.dev/components -->

AI Agent framework built on Convex.

- Automatic storage of thread history, per-user or per-thread.
- RAG for thread context, via hybrid text & vector search, with configuration options.
  Or use the API to query the history yourself and do it your way.
- Opt-in search for messages from other threads (for the same specifieduser).
- Tool calls via the AI SDK, along with Convex-specific helpers.
- Easy workflow integration with the [Workflow component](https://convex.dev/components/workflow).
- Reactive & realtime updates to asynchronous threads.
- Support for streaming text and storing the result in the database.
- Optionally filter tool calls out of the thread history.

Example usage:

```ts
// Define an agent similarly to the AI SDK
const supportAgent = new Agent(components.agent, {
  thread: openai.chat("gpt-4o-mini"),
  textEmbedding: openai.embedding("text-embedding-3-small"),
  instructions: "You are a helpful assistant.",
  tools: { accountLookup, fileTicket, sendEmail },
});

// Use the agent from within a normal action:
export const createThread = action({
  args: { prompt: v.string(), userId: v.string() },
  handler: async (ctx, { prompt, userId }): Promise<{ threadId: string; initialResponse: string }> => {
    // Start a new thread for the user.
    const { threadId, thread } = await supportAgent.createThread(ctx, { userId });
    const result = await thread.generateText({ prompt });
    return { threadId, initialResponse: result.text };
  },
});

// Pick up where you left off:
export const continueThread = action({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, { prompt, threadId }): Promise<string> => {
    // This includes previous message history from the thread automatically.
    const { thread } = await supportAgent.continueThread(ctx, { threadId });
    const result = await thread.generateText({ prompt });
    return result.text;
  },
});

// Or use it within a workflow:
export const supportAgentStep = supportAgent.asAction({ maxSteps: 10 });

const workflow = new WorkflowManager(components.workflow);
const s = internal.example; // where steps are defined

export const supportAgentWorkflow = workflow.define({
  args: { prompt: v.string(), userId: v.string(), threadId: v.string() },
  handler: async (step, { prompt, userId, threadId }) => {
    const suggestion = await step.runAction(s.supportAgentStep, {
      threadId, generateText: { prompt },
    });
    const polished = await step.runAction(s.adaptSuggestionForUser, {
      suggestion, userId,
    });
    await step.runMutation(s.sendUserMessage, { userId, message: polished.message });
  },
});
```

Also see the [Stack article](https://stack.convex.dev/ai-agent).

Coming soon:

- Generate and stream objects
- Nested agent configuration, with agents as tools to other agents.

Found a bug? Feature request? [File it here](https://github.com/get-convex/agent/issues).

## Pre-requisite: Convex

You'll need an existing Convex project to use the component.
Convex is a hosted backend platform, including a database, serverless functions,
and a ton more you can learn about [here](https://docs.convex.dev/get-started).

Run `npm create convex` or follow any of the [quickstarts](https://docs.convex.dev/home) to set one up.

## Installation

Install the component package:

```ts
npm install @convex-dev/agent
```

Create a `convex.config.ts` file in your app's `convex/` folder and install the component by calling `use`:

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";

const app = defineApp();
app.use(agent);

export default app;
```

## Usage

### Configuring the agent

```ts
import { components } from "./_generated/api";
import { Agent } from "@convex-dev/agent";

// Define an agent similarly to the AI SDK
const supportAgent = new Agent(components.agent, {
  // Note: all of these are optional.
  thread: openai.chat("gpt-4o-mini"),
  // Used for vector search (RAG).
  textEmbedding: openai.embedding("text-embedding-3-small"),
  // Will be the default system prompt if not overriden.
  instructions: "You are a helpful assistant.",
  tools: {
    // Standard AI SDK tool
    myTool: tool({ description, parameters, execute: () => {}}),
    // Convex tool
    myConvexTool: createTool({
      description: "My Convex tool",
      args: v.object({...}),
      handler: async (ctx, args) => {
        return "Hello, world!";
      },
    }),
  },
  // Used for fetching context messages.
  contextOptions: {
    // Whether to include tool messages in the context.
    includeToolCalls: true,
    // How many recent messages to include. These are added after the search
    // messages, and do not count against the search limit.
    recentMessages: 10,
    // Whether to search across other threads for relevant messages.
    // By default, only the current thread is searched.
    searchOtherThreads: true,
    // Options for searching messages.
    searchOptions: {
      // The maximum number of messages to fetch.
      limit: 100,
      // Whether to use text search to find messages.
      textSearch: true,
      // Whether to use vector search to find messages.
      vectorSearch: true,
      // Note, this is after the limit is applied.
      // E.g. this will quadruple the number of messages fetched.
      // (two before, and one after each message found in the search)
      messageRange: { before: 2, after: 1 },
    },
  },
  // Used for storing messages.
  storageOptions: {
    // Defaults to false, allowing you to pass in arbitrary context that will
    // be in addition to automatically fetched content.
    // Pass true to have all input messages saved to the thread history.
    saveAllInputMessages: true,
    // Defaults to true
    saveOutputMessages: true,
  },
  // Used for limiting the number of steps when tool calls are involved.
  maxSteps: 10,
  // Used for limiting the number of retries when a tool call fails.
  maxRetries: 3,
});
```

### Starting a thread

You can start a thread from either an action or a mutation.
If it's in an action, you can also start sending messages.
The threadId allows you to resume later and maintain message history.

```ts
// Use the agent from within a normal action:
export const createThread = action({
  args: { prompt: v.string(), userId: v.string() },
  handler: async (ctx, { prompt, userId }): Promise<{ threadId: string; initialResponse: string }> => {
    // Start a new thread for the user.
    const { threadId, thread } = await supportAgent.createThread(ctx, { userId });
    const result = await thread.generateText({ prompt });
    return { threadId, initialResponse: result.text };
  },
});
```

### Continuing a thread

```ts
// Pick up where you left off:
export const continueThread = action({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, { prompt, threadId }): Promise<string> => {
    // This includes previous message history from the thread automatically.
    const { thread } = await supportAgent.continueThread(ctx, { threadId });
    const result = await thread.generateText({ prompt });
    return result.text;
  },
});
```

### Exposing the agent as a Convex action

```ts
export const supportAgentStep = supportAgent.asAction({ maxSteps: 10 });

// Then from within another action:
export const callSupportAgent = action({
  args: { prompt: v.string(), userId: v.string(), threadId: v.string() },
  handler: async (step, { prompt, userId, threadId }) => {
    const suggestion = await step.runAction(s.supportAgentStep, {
      threadId, userId, generateText: { prompt },
    });
  },
});
```

### Using the agent within a workflow

You can use the [Workflow component](https://convex.dev/components/workflow)
to run, with retries and guarantees of eventually completing, surviving server restarts,
and more. Read more about durable workflows
[in this Stack post](https://stack.convex.dev/durable-workflows-and-strong-guarantees).

```ts
const workflow = new WorkflowManager(components.workflow);
const s = internal.example; // where steps are defined

export const supportAgentWorkflow = workflow.define({
  args: { prompt: v.string(), userId: v.string(), threadId: v.string() },
  handler: async (step, { prompt, userId, threadId }) => {
    const suggestion = await step.runAction(s.supportAgentStep, {
      threadId,
      generateText: { prompt },
    });
    const polished = await step.runAction(s.adaptSuggestionForUser, {
      userId,
      generateText: { prompt: suggestion },
    });
    await step.runMutation(s.sendUserMessage, { userId, message: polished.message });
  },
});
```

### Fetching thread history

```ts
const messages = await ctx.runQuery(components.agent.messages.getThreadMessages, {
  threadId,
});
```

### Generating text for a user without an associated thread

```ts
const result = await supportAgent.generateText(ctx, { userId }, { prompt });
```

### Manually managing messages

```ts
const messages = await ctx.runQuery(components.agent.messages.getThreadMessages, {
  threadId,
  {...searchOptions}
});
```

```ts
const messages = await agent.saveMessages(ctx, { threadId, userId, messages });
```

```ts
const messages = await agent.saveSteps(ctx, { threadId, userId, step });
```

// Update the message from pending to complete, along with any associated steps.
```ts
const messages = await agent.completeMessage(ctx, { threadId, userId, messageId });
```

### Manage embeddings

```ts
const messages = await ctx.runQuery(components.agent.embeddings.paginate, {
  vectorDimension: 1536,
  targetModel: "gpt-4o-mini",
  cursor: null,
  limit: 10,
});
```

```ts
const messages = await ctx.runQuery(components.agent.embeddings.deleteBatchForThread, {
  vectorDimension: 1536,
  targetModel: "gpt-4o-mini",
  threadId: "123",
  cursor: null,
  limit: 10,
});
```

```ts
const messages = await ctx.runQuery(components.agent.embeddings.insertBatch, {
  vectorDimension: 1536,
  vectors: [
    {
      model: "gpt-4o-mini",
      kind: "thread",
      userId: "123",
      threadId: "123",
      vector: embedding,
    },
  ],
});
```

```ts
const messages = await ctx.runQuery(components.agent.embeddings.updateBatch, {
  vectors: [
    {
      model: "gpt-4o-mini",
      id: "123", // message's embeddingId
      vector: embedding,
    },
  ],
});
```

```ts
const messages = await ctx.runQuery(components.agent.embeddings.deleteBatch, {
  ids: ["123", "456"],
});
```

See example usage in [example.ts](./example/convex/example.ts).
Read more in [this Stack post](https://stack.convex.dev/ai-agent).

```sh
npm i @convex-dev/agent
```

<!-- END: Include on https://convex.dev/components -->
