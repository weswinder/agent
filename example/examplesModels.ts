import { openai } from "@ai-sdk/openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "Run `npx convex env set OPENAI_API_KEY=<your-api-key>` from the example directory to set the API key.",
  );
}

// If you want to use different models for examples, you can change them here.
export const chat = openai.chat("gpt-4o-mini");
export const textEmbedding = openai.textEmbeddingModel(
  "text-embedding-3-small",
);
