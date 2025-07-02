import { Agent } from "@convex-dev/agent";
import { RAG } from "@convex-dev/rag";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { action } from "../_generated/server";
import { chat, textEmbedding } from "../../examplesModels";

export const rag = new RAG(components.rag, {
  textEmbeddingModel: textEmbedding,
  embeddingDimension: 1536,
});

export const agent = new Agent(components.agent, {
  name: "Basic Agent",
  chat: chat,
  instructions: "Explain what context you used to answer the user's question.",
});

export const addContext = action({
  args: { title: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    await rag.add(ctx, {
      namespace: "global", // Could set a per-user namespace here
      title: args.title,
      text: args.text,
    });
  },
});

export const sendMessage = action({
  args: { threadId: v.string(), prompt: v.string() },
  handler: async (ctx, { threadId, prompt: rawPrompt }) => {
    const { thread } = await agent.continueThread(ctx, { threadId });
    const context = await rag.search(ctx, {
      namespace: "global",
      query: rawPrompt,
      limit: 2,
      chunkContext: { before: 1, after: 1 },
    });
    const prompt = `# Context:\n\n ${context.text}\n\n---\n\n# Question:\n\n"""${rawPrompt}\n"""`;
    const result = await thread.streamText(
      { prompt },
      { saveStreamDeltas: true }, // to enable streaming the response via websockets.
    );
    // To show the context in the demo UI, we record the context used
    await ctx.runMutation(internal.rag.utils.recordContextUsed, {
      messageId: result.messageId,
      entries: context.entries,
      results: context.results,
    });
    await result.consumeStream();
  },
});
