import { action, ActionCtx, mutation } from "./_generated/server";
import { api, components } from "./_generated/api";
import { Agent } from "@convex-dev/agent";
import { v } from "convex/values";
import { openai } from "@ai-sdk/openai";

import { createTool } from "@convex-dev/agent";
import { Doc, Id } from "./_generated/dataModel";

/**
 * TOOLS
 */
export const ideaSearch = createTool({
  description: "Search for ideas by space-delimited keywords",
  args: v.object({
    query: v.string(),
  }),
  handler: async (ctx, { query }): Promise<Doc<"ideas">[]> =>
    ctx.runQuery(api.ideas.searchIdeas, { query }),
});

export const ideaCreation = createTool({
  description:
    "Create an idea, optionally merging with an existing idea. " +
    "You can pass in the entryId of what inspired the idea.",
  args: v.object({
    title: v.string(),
    summary: v.string(),
    tags: v.array(v.string()),
    entryId: v.union(v.id("entries"), v.null()),
  }),
  handler: async (ctx, args): Promise<Id<"ideas">> =>
    ctx.runMutation(api.ideas.createIdea, args),
});

export const ideaUpdate = createTool({
  description: "Update an idea's title, summary, or tags",
  args: v.object({
    id: v.id("ideas"),
    title: v.union(v.string(), v.null()),
    summary: v.union(v.string(), v.null()),
    tags: v.union(v.array(v.string()), v.null()),
  }),
  handler: (ctx, args): Promise<null> =>
    ctx.runMutation(api.ideas.updateIdea, args),
});

export const ideaMerge = createTool({
  description:
    "Merge two ideas, deleting the source and adding its entries to the target",
  args: v.object({
    sourceId: v.id("ideas"),
    targetId: v.id("ideas"),
    newTargetTitle: v.string(),
    newTargetSummary: v.string(),
  }),
  handler: (ctx, args): Promise<null> =>
    ctx.runMutation(api.ideas.mergeIdeas, args),
});

export const attachEntryToIdea = createTool({
  description: "Combine an entry into an existing idea",
  args: v.object({
    ideaId: v.id("ideas"),
    entryId: v.id("entries"),
  }),
  handler: (ctx, args): Promise<null> =>
    ctx.runMutation(api.ideas.attachEntryToIdea, args),
});

/**
 * AGENTS
 */

const ideaManagerAgent = new Agent(components.agent, {
  name: "Idea Manager Agent",
  chat: openai.chat("gpt-4o"), // Fancier model for discerning between ideas
  textEmbedding: openai.embedding("text-embedding-3-small"),
  instructions:
    "You are a helpful assistant that helps manage ideas. " +
    "You can search, create, and merge ideas. " +
    "You can search for existing ideas by space-delimited keywords. " +
    "Over time you should take feedback on how to categorize and merge ideas. " +
    "Be willing to undo mistakes and get better. When in doubt, make separate " +
    "ideas until asked to merge them." +
    "When passing IDs, you MUST pass a real ID verbatim. " +
    "If you don't have one, search for one first.",
  tools: { ideaCreation, ideaUpdate, ideaMerge, ideaSearch },
  contextOptions: {
    recentMessages: 20,
    searchOtherChats: true,
    includeToolCalls: true,
  },
});

const ideaDevelopmentAgent = new Agent(components.agent, {
  name: "Idea Development Agent",
  chat: openai.chat("gpt-4o-mini"),
  textEmbedding: openai.embedding("text-embedding-3-small"),
  instructions:
    "You are a helpful assistant that helps develop ideas. " +
    "You can add to and reorganize the summary of existing ideas. " +
    "Over time you should take feedback on how to organize ideas. " +
    "Be willing to undo mistakes and get better." +
    "You MUST pass the ID verbatim to the updateIdea tool. ",
  tools: { ideaUpdate },
  contextOptions: {
    recentMessages: 5,
    searchOtherChats: false,
    searchOptions: {
      limit: 10,
      textSearch: true,
      vectorSearch: true,
    },
  },
});

/**
 * AGENTS AS TOOLS TO OTHER AGENTS
 */

const ideaManager = ideaManagerAgent.createTool({
  description:
    "Call on me to organize and create ideas. " +
    "Tell me the what you need, and I'll tell you what I did. " +
    "If you want me to do something with a specific existing idea, " +
    "tell me the ID of the idea verbatim.",
  args: v.object({
    id: v.optional(v.id("ideas")),
    command: v.string(),
  }),
  maxSteps: 10,
});

const ideaDeveloper = ideaDevelopmentAgent.createTool({
  description:
    "Call on me to develop ideas. " +
    "Tell me what the idea's ID is, and I'll tell you what I did. " +
    "The ID should be from a real existing idea, not fabricated.",
  args: v.object({
    id: v.id("ideas"),
    command: v.string(),
  }),
  maxSteps: 5,
});

/**
 * AGENT DISPATCHERS
 */

const ideaTriageAgent = new Agent(components.agent, {
  name: "Idea Triage Agent",
  chat: openai.chat("gpt-4o-mini"),
  textEmbedding: openai.embedding("text-embedding-3-small"),
  instructions:
    "You are a helpful assistant that helps triage ideas. " +
    "You should delegate to the manager or developer agents to help you. " +
    "You can search for existing ideas to help triage. " +
    "If you are given an entryId, that is different from an ideaId, " +
    "you should delegate to the ideaManager to create an idea from the entry. " +
    "Be willing to undo mistakes and get better.",
  tools: { ideaSearch, ideaManager, ideaDeveloper },
  contextOptions: {
    recentMessages: 5,
    searchOtherChats: false,
  },
  maxSteps: 20,
});

export const submitRandomThought = action({
  args: {
    userId: v.string(), // in practice you'd use the authenticated user's ID
    entry: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    // Get or create a chat
    const { chat } = await getOrCreateChat(ctx, args.userId);

    const entryId = await ctx.runMutation(api.ideas.createEntry, {
      content: args.entry,
      ideaId: null,
    });

    const result = await chat.generateText({
      prompt: `
      I'm just had a random thought: ${args.entry}.
      The entryId for this is ${entryId}.
      Please help me organize it with existing ideas.
      `,
    });
    return result.text;
  },
});

async function getOrCreateChat(ctx: ActionCtx, userId: string) {
  const page = await ideaTriageAgent.getChats(ctx, { userId });
  const chatId = page.chats[0]?._id;
  if (chatId) {
    const { chat } = await ideaTriageAgent.continueChat(ctx, {
      chatId,
      userId,
    });
    return { chat, chatId };
  }
  return await ideaTriageAgent.startChat(ctx, { userId });
}
