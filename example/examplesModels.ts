import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { openai } from "@ai-sdk/openai";

if (!process.env.OPENAI_API_KEY && !process.env.OPENROUTER_API_KEY) {
  throw new Error(
    "Run `npx convex env set OPENAI_API_KEY=<your-api-key>` or `npx convex env set OPENROUTER_API_KEY=<your-api-key>` from the example directory to set the API key.",
  );
}

let chat, textEmbedding;

if (process.env.OPENAI_API_KEY) {
  chat = openai.chat("gpt-4o-mini");
  textEmbedding = openai.textEmbeddingModel("text-embedding-3-small");
}

if (process.env.OPENROUTER_API_KEY) {
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  chat = openrouter.chat("openai/gpt-4o-mini");
}

// If you want to use different models for examples, you can change them here.
export { chat, textEmbedding };
