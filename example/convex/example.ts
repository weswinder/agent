import { action, mutation } from "./_generated/server";
import { api, components } from "./_generated/api";
import { Agent, tool } from "@convex-dev/agent";
import { v } from "convex/values";
import { openai } from "@ai-sdk/openai";
import { serializeMessageWithId, serializeStep } from "../../src/mapping";

export const weatherTool = tool({
  description: "Get the weather in a location",
  args: v.object({
    location: v.string(),
  }),
  handler: async (ctx, { location }) => ({
    location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
  }),
});

const agent = new Agent(components.agent, {
  name: "Example Agent",
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

export const t = action({
  args: {},
  handler: async (ctx) => {
    const { chat } = await agent.continueChat(ctx, {
      userId: "test",
      chatId: "j57agars0dsmn8vep711y6ev9s7dk5wg",
    });
    const result = await chat.streamText({
      model,
      maxSteps: 5,
      prompt:
        "What is the weather in San Francisco? " +
        "Please get a second report if the first says it's over 60 degrees." +
        "Then give a summary of whether they match and if it's good weather.",
      // tools: { a: weatherTool },
      toolChoice: { toolName: "weather", type: "tool" },
      onStepFinish: async (step) => {
        await ctx.runMutation(api.example.blindWrite, {
          table: "stepsFinish",
          doc: serializeStep(step),
        });
        await Promise.all(
          step.response.messages.map((m) =>
            ctx.runMutation(api.example.blindWrite, {
              table: "msgFinish",
              doc: serializeMessageWithId(m),
            })
          )
        );
      },
    });
    let t = "";
    for await (const delta of result.textStream) {
      t += delta;
    }
    console.log(t);
    // await ctx.runMutation(api.example.blindWrite, {
    //   table: "results",
    //   doc: JSON.parse(JSON.stringify(result)),
    // });
    // await Promise.all(
    //   result...map((m) =>
    //     ctx.runMutation(api.example.blindWrite, {
    //       table: "responseMessages",
    //       doc: serializeMessageWithId(m),
    //     })
    //   )
    // );
    // await Promise.all(
    //   serializeResponse(result.response).map((m) =>
    //     ctx.runMutation(api.example.blindWrite, {
    //       table: "messages",
    //       doc: m,
    //     })
    //   )
    // );
    // await Promise.all(
    //   result.steps.map((s) =>
    //     ctx.runMutation(api.example.blindWrite, {
    //       table: "steps",
    //       doc: serializeStep(s),
    //     })
    //   )
    // );
  },
});

export const blindWrite = mutation({
  args: {
    table: v.string(),
    doc: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert(args.table, args.doc);
  },
});

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
      tools: { a: weatherTool },
      toolChoice: { toolName: "a", type: "tool" },
      // memory: agent.tools.memory({ retrievalConfig: {...}})
    });
    console.log(result.steps);
    console.log(result.response.messages[1].content);
    return result.text;
  },
});
