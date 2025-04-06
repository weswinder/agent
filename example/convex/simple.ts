import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { weatherTool } from "./example";
import { action, query } from "./_generated/server";
import { v } from "convex/values";

const supportAgent = new Agent(components.agent, {
  chat: openai.chat("gpt-4o-mini"),
  textEmbedding: openai.embedding("text-embedding-3-small"),
  defaultSystemPrompt: "You are a helpful assistant.",
  tools: { weather: weatherTool },
});

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
    const { chat } = await supportAgent.continueChat(ctx, { chatId });
    const result = await chat.generateText({ prompt });
    return result.text;
  },
});

export const getChatMessages = query({
  args: { chatId: v.string() },
  handler: async (ctx, { chatId }) => {
    return await supportAgent.getChatMessages(ctx, { chatId, limit: 100 });
  },
});

export const getInProgressMessages = query({
  args: { chatId: v.string() },
  handler: async (ctx, { chatId }) => {
    const { messages } = await supportAgent.getChatMessages(ctx, {
      chatId,
      statuses: ["pending"],
    });
    const withSteps = await Promise.all(
      messages.map(async (message) => {
        const messageId = message.id;
        const steps = await supportAgent.getSteps(ctx, { messageId });
        return { message, steps };
      })
    );
    return withSteps;
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
