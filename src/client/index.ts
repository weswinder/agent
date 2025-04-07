import type { EmbeddingModelV1, LanguageModelV1 } from "@ai-sdk/provider";
import type {
  CoreMessage,
  DeepPartial,
  GenerateObjectResult,
  GenerateTextResult,
  StepResult,
  StreamObjectResult,
  StreamTextResult,
  Tool,
  ToolChoice,
  ToolExecutionOptions,
  ToolSet,
} from "ai";
import { generateObject, generateText, streamObject, streamText } from "ai";
import { api } from "../component/_generated/api";
import { Message, MessageStatus, SearchOptions } from "../validators";
import {
  ChatDoc,
  OpaqueIds,
  RunActionCtx,
  RunMutationCtx,
  RunQueryCtx,
  UseApi,
} from "./types";
// TODO: is this the only dependency that needs helpers in client?
import { assert } from "convex-helpers";
import { ConvexToZod, convexToZod } from "convex-helpers/server/zod";
import { Infer, Validator } from "convex/values";
import {
  promptOrMessagesToCoreMessages,
  serializeMessageWithId,
  serializeNewMessagesInStep,
  serializeStep,
} from "../mapping";
import { DEFAULT_MESSAGE_RANGE, extractText } from "../shared";
import { Doc } from "../component/_generated/dataModel";

export type ContextOptions = {
  /**
   * Whether to include tool messages in the context.
   */
  includeToolCalls?: boolean;
  /**
   * How many recent messages to include. These are added after the search
   * messages, and do not count against the search limit.
   */
  recentMessages?: number;
  /**
   * Options for searching messages.
   */
  searchOptions?: {
    /**
     * The maximum number of messages to fetch.
     */
    limit: number;
    /**
     * Whether to use text search to find messages.
     */
    textSearch?: boolean;
    /**
     * Whether to use vector search to find messages.
     */
    vectorSearch?: boolean;
    /**
     * Note, this is after the limit is applied.
     * By default this will quadruple the number of messages fetched.
     * (two before, and one after each message found in the search)
     */
    messageRange?: { before: number; after: number };
  };
  /**
   * Whether to search across other chats for relevant messages.
   * By default, only the current chat is searched.
   */
  searchOtherChats?: boolean;
};

export type StorageOptions = {
  // Defaults to false, allowing you to pass in arbitrary context that will
  // be in addition to automatically fetched content.
  // Pass true to have all input messages saved to the chat history.
  saveAllInputMessages?: boolean;
  // Defaults to true
  saveOutputMessages?: boolean;
};

export type GenerationOutputMetadata = { messageId: string };

type CoreMessageMaybeWithId = CoreMessage & { id?: string | undefined };

export class Agent<AgentTools extends ToolSet> {
  constructor(
    public component: UseApi<typeof api>,
    public options: {
      name?: string;
      chat: LanguageModelV1;
      textEmbedding?: EmbeddingModelV1<string>;
      instructions?: string;
      tools?: AgentTools;
      contextOptions?: ContextOptions;
      maxSteps?: number;
    }
  ) {}

  /**
   * Start a new chat with the agent. This will have a fresh history, though if
   * you pass in a userId you can have it search across other chats for relevant
   * messages as context for the LLM calls.
   * @param ctx The context of the Convex function. From an action, you can chat
   *   with the agent. From a mutation, you can start a chat and save the chatId
   *   to pass to continueChat later.
   * @param args The chat metadata.
   * @returns The chatId of the new chat and the chat object.
   */
  async startChat(
    ctx: RunActionCtx,
    args: {
      /**
       * The userId to associate with the chat. If not provided, the chat will be
       * anonymous.
       */
      userId?: string;
      /**
       * The parent chatIds to merge with.
       * If the chat is a continuation of one or many previous chats,
       * you can pass in the chatIds of the parent chats to merge the histories.
       */
      parentChatIds?: string[];
      /**
       * The title of the chat. Not currently used.
       */
      title?: string;
      /**
       * The summary of the chat. Not currently used.
       */
      summary?: string;
    }
  ): Promise<{
    chatId: string;
    chat: Chat<AgentTools>;
  }>;
  /**
   * Start a new chat with the agent. This will have a fresh history, though if
   * you pass in a userId you can have it search across other chats for relevant
   * messages as context for the LLM calls.
   * @param ctx The context of the Convex function. From a mutation, you can
   * start a chat and save the chatId to pass to continueChat later.
   * @param args The chat metadata.
   * @returns The chatId of the new chat.
   */
  async startChat(
    ctx: RunMutationCtx,
    args: {
      userId?: string;
      parentChatIds?: string[];
      title?: string;
      summary?: string;
    }
  ): Promise<{
    chatId: string;
  }>;
  async startChat(
    ctx: RunActionCtx | RunMutationCtx,
    args: {
      userId: string;
      parentChatIds?: string[];
      title?: string;
      summary?: string;
    }
  ): Promise<{
    chatId: string;
    chat?: Chat<AgentTools>;
  }> {
    const chatDoc = await ctx.runMutation(this.component.messages.createChat, {
      defaultSystemPrompt: this.options.instructions,
      userId: args.userId,
      title: args.title,
      summary: args.summary,
      parentChatIds: args.parentChatIds,
    });
    if (!("runAction" in ctx)) {
      return { chatId: chatDoc._id };
    }
    const { chat } = await this.continueChat(ctx, {
      chatId: chatDoc._id,
      userId: args.userId,
    });
    return {
      chatId: chatDoc._id,
      chat,
    };
  }

  async continueChat(
    ctx: RunActionCtx,
    {
      chatId,
      userId,
    }: {
      chatId: string;
      /**
       * If supplied, the userId can be used to search across other chats for
       * relevant messages from the same user as context for the LLM calls.
       */
      userId?: string;
    }
  ): Promise<{
    chat: Chat<AgentTools>;
  }> {
    // return this.component.continueChat(ctx, args);
    return {
      chat: {
        generateText: this.generateText.bind(this, ctx, { userId, chatId }),
        streamText: this.streamText.bind(this, ctx, { userId, chatId }),
        generateObject: this.generateObject.bind(this, ctx, { userId, chatId }),
        streamObject: this.streamObject.bind(this, ctx, { userId, chatId }),
      } as Chat<AgentTools>,
    };
  }

  async fetchContextMessages(
    ctx: RunQueryCtx | RunActionCtx,
    args: {
      userId?: string;
      chatId?: string;
      messages: CoreMessage[];
      parentMessageId?: string;
    } & ContextOptions
  ): Promise<CoreMessage[]> {
    assert(args.userId || args.chatId, "Specify userId or chatId");
    // Fetch the latest messages from the chat
    const contextMessages: CoreMessage[] = [];
    const opts = this.mergedContextOptions(args);
    if (opts.searchOptions?.textSearch || opts.searchOptions?.vectorSearch) {
      if (!("runAction" in ctx)) {
        throw new Error("searchUserMessages only works in an action");
      }
      const searchMessages = await ctx.runAction(
        this.component.messages.searchMessages,
        {
          userId: args.searchOtherChats ? args.userId : undefined,
          chatId: args.chatId,
          parentMessageId: args.parentMessageId,
          ...(await this.searchOptionsWithDefaults(opts, args.messages)),
        }
      );
      // TODO: track what messages we used for context
      contextMessages.push(...searchMessages.map((m) => m.message!));
    }
    if (args.chatId) {
      const { messages } = await ctx.runQuery(
        this.component.messages.getChatMessages,
        {
          chatId: args.chatId,
          isTool: args.includeToolCalls ?? false,
          limit: args.recentMessages,
          parentMessageId: args.parentMessageId,
          order: "desc",
          statuses: ["success"],
        }
      );
      contextMessages.push(...messages.map((m) => m.message!));
    }
    return contextMessages;
  }

  async saveMessages(
    ctx: RunMutationCtx,
    args: {
      chatId: string;
      messages: CoreMessageMaybeWithId[];
      pending?: boolean;
      parentMessageId?: string;
      failPendingSteps?: boolean;
    }
  ): Promise<{
    lastMessageId: string;
    messageIds: string[];
  }> {
    const result = await ctx.runMutation(this.component.messages.addMessages, {
      chatId: args.chatId,
      agentName: this.options.name,
      model: this.options.chat.modelId,
      messages: args.messages.map(serializeMessageWithId),
      failPendingSteps: args.failPendingSteps ?? true,
      pending: args.pending ?? false,
      parentMessageId: args.parentMessageId,
    });
    return {
      lastMessageId: result.messages.at(-1)!._id,
      messageIds: result.messages.map((m) => m._id),
    };
  }

  async saveStep<TOOLS extends ToolSet>(
    ctx: RunMutationCtx,
    args: { chatId: string; messageId: string; step: StepResult<TOOLS> }
  ): Promise<void> {
    const step = serializeStep(args.step as StepResult<ToolSet>);
    const messages = serializeNewMessagesInStep(args.step);
    console.log("saveStep", args.step);
    await ctx.runMutation(this.component.messages.addSteps, {
      chatId: args.chatId,
      messageId: args.messageId,
      steps: [{ step, messages: messages }],
      failPendingSteps: false,
    });
  }

  // If you manually create a message, call this to either commit or reset it.
  async completeMessage<TOOLS extends ToolSet>(
    ctx: RunMutationCtx,
    args: {
      chatId: string;
      messageId: string;
      result:
        | { kind: "error"; error: string }
        | { kind: "success"; value: { steps: StepResult<TOOLS>[] } };
    }
  ): Promise<void> {
    const result = args.result;
    if (result.kind === "success") {
      await ctx.runMutation(this.component.messages.commitMessage, {
        messageId: args.messageId,
      });
    } else {
      await ctx.runMutation(this.component.messages.addSteps, {
        chatId: args.chatId,
        messageId: args.messageId,
        steps: [],
        failPendingSteps: true,
      });
    }
  }

  /**
   * This behaves like {@link generateText} except that it add context based on
   * the userId and chatId. It saves the input and resulting messages to the
   * chat, if specified.
   * however. To do that, use {@link continueChat} or {@link saveMessages}.
   * @param ctx The context of the agent.
   * @param args The arguments to the generateText function.
   * @returns The result of the generateText function.
   */
  async generateText<
    TOOLS extends ToolSet,
    OUTPUT = never,
    OUTPUT_PARTIAL = never,
  >(
    ctx: RunActionCtx,
    {
      userId,
      chatId,
    }: {
      userId?: string;
      chatId: string;
    },
    args: TextArgs<
      AgentTools,
      TOOLS,
      Parameters<typeof generateText<TOOLS, OUTPUT, OUTPUT_PARTIAL>>[0]
    >
  ): Promise<
    GenerateTextResult<TOOLS & AgentTools, OUTPUT> & GenerationOutputMetadata
  > {
    const { prompt, messages: raw, ...rest } = args;
    const messages = promptOrMessagesToCoreMessages({ prompt, messages: raw });
    const contextMessages = await this.fetchContextMessages(ctx, {
      ...args,
      userId,
      chatId,
      messages,
    });
    const { lastMessageId: messageId } = await this.saveMessages(ctx, {
      chatId,
      messages: args.saveAllInputMessages ? messages : messages.slice(-1),
      pending: true,
      parentMessageId: args.parentMessageId,
    });
    const toolCtx = { ...ctx, userId, chatId, messageId };
    const tools = wrapTools(toolCtx, this.options.tools, args.tools) as TOOLS;
    try {
      const result = await generateText({
        model: this.options.chat,
        messages: [...contextMessages, ...messages],
        system: this.options.instructions,
        maxSteps: this.options.maxSteps,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toolChoice: args.toolChoice as any,
        ...rest,
        tools,
        onStepFinish: async (step) => {
          if (chatId && messageId && args.saveOutputMessages) {
            await this.saveStep(ctx, {
              chatId,
              messageId,
              step,
            });
          }
          return args.onStepFinish?.(step);
        },
      });
      return { ...result, messageId };
    } catch (error) {
      if (chatId && messageId) {
        await ctx.runMutation(this.component.messages.rollbackMessage, {
          messageId,
          error: (error as Error).message,
        });
      }
      throw error;
    }
  }

  async streamText<
    TOOLS extends ToolSet,
    OUTPUT = never,
    PARTIAL_OUTPUT = never,
  >(
    ctx: RunActionCtx,
    { userId, chatId }: { userId?: string; chatId: string },
    args: TextArgs<
      AgentTools,
      TOOLS,
      Parameters<typeof streamText<TOOLS, OUTPUT, PARTIAL_OUTPUT>>[0]
    >
  ): Promise<
    StreamTextResult<TOOLS, PARTIAL_OUTPUT> & GenerationOutputMetadata
  > {
    const { prompt, messages: raw, ...rest } = args;
    const messages = promptOrMessagesToCoreMessages({ prompt, messages: raw });
    const contextMessages = await this.fetchContextMessages(ctx, {
      ...args,
      userId,
      chatId,
      messages,
    });
    const { lastMessageId: messageId } = await this.saveMessages(ctx, {
      chatId,
      messages: args.saveAllInputMessages ? messages : messages.slice(-1),
      pending: true,
      parentMessageId: args.parentMessageId,
    });
    const toolCtx = { ...ctx, userId, chatId, messageId };
    const tools = wrapTools(toolCtx, this.options.tools, args.tools) as TOOLS;
    const result = streamText({
      model: this.options.chat,
      messages: [...contextMessages, ...messages],
      system: this.options.instructions,
      maxSteps: this.options.maxSteps,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toolChoice: args.toolChoice as any,
      ...rest,
      tools,
      onChunk: async (chunk) => {
        console.log("onChunk", chunk);
        return args.onChunk?.(chunk);
      },
      onError: async (error) => {
        console.error("onError", error);
        if (chatId && messageId) {
          await ctx.runMutation(this.component.messages.rollbackMessage, {
            messageId,
            error: (error.error as Error).message,
          });
        }
        return args.onError?.(error);
      },
      onFinish: async (result) => {
        result.response.messages.forEach((message) => {
          console.log("onFinish", message);
        });
        return args.onFinish?.(result);
      },
      onStepFinish: async (step) => {
        console.log("onStepFinish", step);
        if (chatId && messageId) {
          await this.saveStep(ctx, {
            chatId,
            messageId,
            step,
          });
        }
        return args.onStepFinish?.(step);
      },
    });
    return { ...result, messageId };
  }

  // TODO: add the crazy number of overloads to get types through
  async generateObject<T>(
    ctx: RunActionCtx,
    { userId, chatId }: { userId?: string; chatId: string },
    args: Omit<Parameters<typeof generateObject>[0], "model"> & {
      model?: LanguageModelV1;
    } & { parentMessageId?: string } & ContextOptions &
      StorageOptions
  ): Promise<GenerateObjectResult<T> & GenerationOutputMetadata> {
    const { prompt, messages: raw, ...rest } = args;
    const messages = promptOrMessagesToCoreMessages({ prompt, messages: raw });
    const contextMessages = await this.fetchContextMessages(ctx, {
      ...args,
      userId,
      chatId,
      messages,
    });
    const { lastMessageId: messageId } = await this.saveMessages(ctx, {
      chatId,
      messages: args.saveAllInputMessages ? messages : messages.slice(-1),
      pending: true,
    });
    const result = (await generateObject({
      model: this.options.chat,
      messages: [...contextMessages, ...messages],
      ...rest,
    })) as GenerateObjectResult<T>;
    return { ...result, messageId };
  }

  async streamObject<T>(
    ctx: RunMutationCtx,
    { userId, chatId }: { userId?: string; chatId: string },
    args: Omit<Parameters<typeof streamObject<T>>[0], "model"> & {
      model?: LanguageModelV1;
    } & { parentMessageId?: string } & ContextOptions &
      StorageOptions
  ): Promise<
    StreamObjectResult<DeepPartial<T>, T, never> & GenerationOutputMetadata
  > {
    const { prompt, messages: raw, ...rest } = args;
    const messages = promptOrMessagesToCoreMessages({ prompt, messages: raw });
    const contextMessages = await this.fetchContextMessages(ctx, {
      ...args,
      userId,
      chatId,
      messages,
    });
    const { lastMessageId: messageId } = await this.saveMessages(ctx, {
      chatId,
      messages: args.saveAllInputMessages ? messages : messages.slice(-1),
      pending: true,
    });
    const result = streamObject<T>({
      model: this.options.chat,
      messages: [...contextMessages, ...messages],
      ...rest,
      onError: async (error) => {
        console.error("onError", error);
        return args.onError?.(error);
      },
      onFinish: async (result) => {
        console.log("onFinish", result);
      },
    }) as StreamObjectResult<DeepPartial<T>, T, never>;
    return { ...result, messageId };
  }

  mergedContextOptions(opts: ContextOptions): ContextOptions {
    const searchOptions = {
      ...this.options.contextOptions?.searchOptions,
      ...opts.searchOptions,
    };
    return {
      ...this.options.contextOptions,
      ...opts,
      searchOptions: searchOptions.limit
        ? (searchOptions as SearchOptions)
        : undefined,
    };
  }

  async searchOptionsWithDefaults(
    contextOptions: ContextOptions,
    messages: CoreMessage[]
  ): Promise<SearchOptions> {
    assert(
      contextOptions.searchOptions?.textSearch ||
        contextOptions.searchOptions?.vectorSearch,
      "searchOptions is required"
    );
    assert(messages.length > 0, "Core messages cannot be empty");
    const text = extractText(messages.at(-1)!);
    const search: SearchOptions = {
      limit: contextOptions.searchOptions?.limit ?? 10,
      messageRange: {
        ...DEFAULT_MESSAGE_RANGE,
        ...contextOptions.searchOptions?.messageRange,
      },
      text: extractText(messages.at(-1)!),
    };
    if (
      contextOptions.searchOptions?.vectorSearch &&
      text &&
      this.options.textEmbedding
    ) {
      search.vector = (
        await this.options.textEmbedding.doEmbed({
          values: [text],
        })
      ).embeddings[0];
      search.vectorModel = this.options.textEmbedding.modelId;
    }
    return search;
  }

  async getChats(
    ctx: RunQueryCtx,
    args: { userId: string }
  ): Promise<{ chats: ChatDoc[]; continueCursor: string; isDone: boolean }> {
    return await ctx.runQuery(this.component.messages.getChatsByUserId, {
      userId: args.userId,
    });
  }

  async getChatMessages(
    ctx: RunQueryCtx,
    args: {
      chatId: string;
      limit?: number;
      statuses?: MessageStatus[];
      cursor?: string;
      includeToolCalls?: boolean;
      order?: "asc" | "desc";
    }
  ): Promise<{
    messages: (Message & { id: string })[];
    continueCursor: string;
    isDone: boolean;
  }> {
    const messages = await ctx.runQuery(
      this.component.messages.getChatMessages,
      {
        chatId: args.chatId,
        limit: args.limit,
        statuses: args.statuses,
        cursor: args.cursor,
        isTool: args.includeToolCalls,
        order: args.order,
      }
    );
    return {
      messages: messages.messages
        .map((m) => m && { ...m.message, id: m._id })
        .filter((m): m is Message & { id: string } => m !== undefined),
      continueCursor: messages.continueCursor,
      isDone: messages.isDone,
    };
  }

  /**
   * Create a tool that can call this agent.
   * @param spec The specification for the arguments to this agent.
   *   They will be encoded as JSON and passed to the agent.
   * @returns The agent as a tool that can be passed to other agents.
   */
  createTool(spec: {
    description: string;
    args: Validator<unknown, "required", string>;
    contextOptions?: ContextOptions;
    maxSteps?: number;
  }) {
    return createTool({
      ...spec,
      handler: async (ctx, args) => {
        const maxSteps = spec.maxSteps ?? this.options.maxSteps;
        const contextOptions =
          spec.contextOptions && this.mergedContextOptions(spec.contextOptions);
        const value = await this.generateText(
          ctx,
          { userId: ctx.userId, chatId: ctx.chatId },
          {
            prompt: JSON.stringify(args),
            parentMessageId: ctx.messageId,
            maxSteps,
            ...contextOptions,
          }
        );
        return value.text;
      },
    });
  }
}

export type ToolCtx = RunActionCtx & {
  userId?: string;
  chatId: string;
  messageId?: string;
};

/**
 * This is a wrapper around the ai.tool function that adds support for
 * userId and chatId to the tool, if they're called within a chat from an agent.
 * @param tool The AI tool. See https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling
 * @returns The same tool, but with userId and chatId args support added.
 */
export function createTool<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  V extends Validator<any, any, any>,
  RESULT,
>(convexTool: {
  args: V;
  description?: string;
  handler: (
    ctx: ToolCtx,
    args: Infer<V>,
    options: ToolExecutionOptions
  ) => PromiseLike<RESULT>;
  ctx?: ToolCtx;
}): Tool<ConvexToZod<V>, RESULT> {
  const tool = {
    __acceptsCtx: true,
    ctx: convexTool.ctx,
    description: convexTool.description,
    parameters: convexToZod(convexTool.args),
    async execute(args: Infer<V>, options: ToolExecutionOptions) {
      if (!this.ctx) {
        throw new Error(
          "To use a Convex tool, you must either provide the ctx" +
            " at definition time (dynamically in an action), or use the Agent to" +
            " call it (which injects the ctx, userId and chatId)"
        );
      }
      return convexTool.handler(this.ctx, args, options);
    },
  };
  return tool;
}

function wrapTools(
  ctx: ToolCtx,
  ...toolSets: (ToolSet | undefined)[]
): ToolSet {
  const output = {} as ToolSet;
  for (const toolSet of toolSets) {
    if (!toolSet) {
      continue;
    }
    for (const [name, tool] of Object.entries(toolSet)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(tool as any).__acceptsCtx) {
        output[name] = tool;
      } else {
        const out = { ...tool, ctx };
        output[name] = out;
      }
    }
  }
  return output;
}

type TextArgs<
  AgentTools extends ToolSet,
  TOOLS extends ToolSet,
  T extends {
    toolChoice?: ToolChoice<TOOLS & AgentTools>;
    tools?: TOOLS;
    model: LanguageModelV1;
  },
> = Omit<T, "toolChoice" | "tools" | "model"> & {
  model?: LanguageModelV1;
  parentMessageId?: string;
} & {
  tools?: TOOLS;
  toolChoice?: ToolChoice<{ [key in keyof TOOLS | keyof AgentTools]: unknown }>;
} & ContextOptions &
  StorageOptions;

type ObjectArgs<
  T extends {
    model: LanguageModelV1;
  },
> = Omit<T, "model"> & {
  model?: LanguageModelV1;
} & ContextOptions &
  StorageOptions;

interface Chat<AgentTools extends ToolSet> {
  generateText<TOOLS extends ToolSet, OUTPUT = never, OUTPUT_PARTIAL = never>(
    args: TextArgs<
      AgentTools,
      TOOLS,
      Parameters<typeof generateText<TOOLS, OUTPUT, OUTPUT_PARTIAL>>[0]
    >
  ): Promise<
    GenerateTextResult<TOOLS & AgentTools, OUTPUT> & GenerationOutputMetadata
  >;

  streamText<TOOLS extends ToolSet, OUTPUT = never, PARTIAL_OUTPUT = never>(
    args: TextArgs<
      AgentTools,
      TOOLS,
      Parameters<typeof streamText<TOOLS, OUTPUT, PARTIAL_OUTPUT>>[0]
    >
  ): Promise<
    StreamTextResult<TOOLS & AgentTools, PARTIAL_OUTPUT> &
      GenerationOutputMetadata
  >;
  // TODO: add all the overloads
  generateObject<T>(
    args: ObjectArgs<Parameters<typeof generateObject>[0]>
  ): Promise<GenerateObjectResult<T> & GenerationOutputMetadata>;
  streamObject<T>(
    args: ObjectArgs<Parameters<typeof streamObject<T>>[0]>
  ): Promise<
    StreamObjectResult<DeepPartial<T>, T, never> & GenerationOutputMetadata
  >;
}
