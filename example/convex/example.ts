import { action } from "./_generated/server";
import { components } from "./_generated/api";
import { ConvexAI } from "@convex-dev/agent";
import { generateText } from "ai";
import { v } from "convex/values";
import { openai } from "@ai-sdk/openai";

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
    });
    console.log(result.steps);
    return result.text;
  },
});
