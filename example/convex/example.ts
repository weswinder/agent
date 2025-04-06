import { action } from "./_generated/server";
import { components } from "./_generated/api";
import { Agent } from "@convex-dev/agent";
import { tool } from "ai";
import { v } from "convex/values";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const weatherTool = tool({
  description: "Get the weather in a location",
  parameters: z.object({
    location: z.string().describe("The location to get the weather for"),
  }),
  execute: async ({ location } /*{ domainId, chatId  <<--INJECTED }*/) => ({
    location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
  }),
});

const agent = new Agent(components.agent, {
  chat: openai.chat("gpt-4o-mini"),
  textEmbedding: openai.embedding("text-embedding-3-small"),
  defaultSystemPrompt: "You are a helpful assistant.",
  // defaultMemoryConfig: {
  //   messageHistory: {
  //     recentMessages: 10,
  //     summarize: async ({messages, steps}) => {
  //       return steps.map((step) => step.step.content).join("\n");
  //     },
  //   },
  //   searchMessages: {
  //     topK: 10,
  //   },
  //   searchThreadOnly: true,
  // },
  tools: {
    // workingMemory: workingMemory(),
    // chatMemory: chatHistory(),
    // fileSearch: fileSearch(),
    weather: weatherTool,
  },
});

const model = openai.chat("gpt-4o-mini");

export const generate = action({
  args: {
    prompt: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { chatId, chat } = await agent.startChat(ctx, {
      // All optional
      userId: args.userId,
      // Later on we can auto-generate these
      title: "My first chat",
      summary: "This is a summary of the chat.",
    });
    const result = await chat.generateText({
      model,
      prompt: args.prompt,
      // memoryConfig: {
      //   messageHistory: {
      //     previousMessages: 10,
      //   },
      //   searchMessages: {
      //     topK: 10,
      //     messageRange: 2,
      //     includeToolCalls: true,
      //   },
      //   autoSave: true, // defaults to true
      //   saveMessages: false, // defaults to true: the step messages
      //   saveSteps: false, // defaults to true
      //   // save request? response?
      //   // summarize: async ({ steps }) => {
      //   //   return steps.map((step) => step.step.content).join("\n");
      //   // },
      //   updateChatTitle: true,
      //   updateChatSummary: true,
      // },
      // toolChoices: ["memory", "weather"], // type safe
      tools: {
        // memory: agent.tools.memory({ retrievalConfig: {...}})
      },
    });
    console.log(result.steps);
    console.log(result.response.messages[1].content);
    return result.text;
  },
});
