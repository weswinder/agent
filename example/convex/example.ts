import { action } from "./_generated/server";
import { components } from "./_generated/api";
import { ConvexAI } from "@convex-dev/agent";
import { generateText, tool } from "ai";
import { v } from "convex/values";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const agent = new ConvexAI(components.agent, {
  embedder: "test",
});

const model = openai.chat("gpt-4o-mini");

export const generate = action({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await generateText({
      model,
      prompt: args.prompt,
      tools: {
        weather: tool({
          description: "Get the weather in a location",
          parameters: z.object({
            location: z
              .string()
              .describe("The location to get the weather for"),
          }),
          execute: async ({ location }) => ({
            location,
            temperature: 72 + Math.floor(Math.random() * 21) - 10,
          }),
        }),
      },
    });
    console.log(result.steps);
    return result.text;
  },
});
