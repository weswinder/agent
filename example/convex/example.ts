import { WorkflowManager } from "@convex-dev/workflow";
import { Agent } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { action, query } from "./_generated/server";
import { v } from "convex/values";

// Define an agent similarly to the AI SDK
const supportAgent = new Agent(components.agent, {
  chat: openai.chat("gpt-4o-mini"),
  textEmbedding: openai.embedding("text-embedding-3-small"),
  instructions: "You are a helpful assistant.",
});

// Use the agent from within a normal action:
export const startChatting = action({
  args: { prompt: v.string(), userId: v.string() },
  handler: async (ctx, { prompt, userId }) => {
    const { chatId, chat } = await supportAgent.startChat(ctx, { userId });
    const result = await chat.generateText({ prompt });
    return { chatId, text: result.text };
  },
});

export const continueChat = action({
  args: { prompt: v.string(), chatId: v.string() },
  handler: async (ctx, { prompt, chatId }) => {
    // This includes previous message history from the chat automatically.
    const { chat } = await supportAgent.continueChat(ctx, { chatId });
    const result = await chat.generateText({ prompt });
    return result.text;
  },
});

// Or use it within a workflow:
export const supportAgentStep = supportAgent.asAction({ maxSteps: 10 });

const workflow = new WorkflowManager(components.workflow);
const s = internal.example; // where steps are defined

export const supportAgentWorkflow = workflow.define({
  args: { prompt: v.string(), userId: v.string() },
  handler: async (step, { prompt, userId }) => {
    const { chatId } = await step.runAction(s.supportAgentStep, {
      createChat: { userId },
    });
    const result = await step.runAction(s.supportAgentStep, {
      chatId, generateText: { prompt },
    });
    console.log(result);
    // Call other agents here
  },
});

export const getChatMessages = query({
  args: { chatId: v.string() },
  handler: async (ctx, { chatId }) => {
    return await ctx.runQuery(components.agent.messages.getChatMessages, {
      chatId,
      limit: 100,
    });
  },
});

export const getInProgressMessages = query({
  args: { chatId: v.string() },
  handler: async (ctx, { chatId }) => {
    const { messages } = await ctx.runQuery(
      components.agent.messages.getChatMessages,
      { chatId, statuses: ["pending"] },
    );
    return messages;
  },
});

export const streamChat = action({
  args: { prompt: v.string(), userId: v.string() },
  handler: async (ctx, { prompt, userId }) => {
    const { chatId, chat } = await supportAgent.startChat(ctx, { userId });
    const result = await chat.streamText({ prompt });
    return { chatId, text: result.text };
  },
});
