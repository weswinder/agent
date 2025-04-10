import type { EmbeddingModelV1, LanguageModelV1 } from "@ai-sdk/provider";
import type {
  CoreMessage,
  DeepPartial,
  GenerateObjectResult,
  GenerateTextResult,
  JSONValue,
  RepairTextFunction,
  StepResult,
  StreamObjectResult,
  StreamTextResult,
  TelemetrySettings,
  Tool,
  ToolChoice,
  ToolExecutionOptions,
  ToolSet,
  Message as UIMessage,
} from "ai";
import { generateObject, generateText, streamObject, streamText } from "ai";
import { assert } from "convex-helpers";
import {
  ConvexToZod,
  convexToZod,
  zodToConvex,
} from "convex-helpers/server/zod";
import { internalActionGeneric } from "convex/server";
import { Infer, v, Validator } from "convex/values";
import { z } from "zod";
import { Mounts } from "../component/_generated/api";
import {
  validateVectorDimension,
  VectorDimension,
} from "../component/vector/tables";
import {
  promptOrMessagesToCoreMessages,
  serializeMessageWithId,
  serializeNewMessagesInStep,
  serializeObjectResult,
  serializeStep,
} from "../mapping";
import {
  DEFAULT_MESSAGE_RANGE,
  DEFAULT_RECENT_MESSAGES,
  extractText,
} from "../shared";
import {
  CallSettings,
  ProviderMetadata,
  ProviderOptions,
  SearchOptions,
  vContextOptions,
  vSafeObjectArgs,
  vStorageOptions,
  vTextArgs,
} from "../validators";
import { RunActionCtx, RunMutationCtx, RunQueryCtx, UseApi } from "./types";

export { convexToZod, zodToConvex };

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
   * Whether to search across other threads for relevant messages.
   * By default, only the current thread is searched.
   */
  searchOtherThreads?: boolean;
};

export type StorageOptions = {
  // Defaults to false, allowing you to pass in arbitrary context that will
  // be in addition to automatically fetched content.
  // Pass true to have all input messages saved to the thread history.
  saveAllInputMessages?: boolean;
  // Defaults to true, saving the prompt, or last message passed to generateText.
  saveAnyInputMessages?: boolean;
  // Defaults to true.
  saveOutputMessages?: boolean;
};

export type GenerationOutputMetadata = { messageId?: string };

type CoreMessageMaybeWithId = CoreMessage & { id?: string | undefined };

export class Agent<AgentTools extends ToolSet> {
  constructor(
    public component: UseApi<Mounts>,
    public options: {
      name?: string;
      chat: LanguageModelV1;
      textEmbedding?: EmbeddingModelV1<string>;
      instructions?: string;
      tools?: AgentTools;
      contextOptions?: ContextOptions;
      // TODO: storageOptions?: StorageOptions;
      maxSteps?: number;
      // TODO: maxRetries?: number;
    }
  ) {}

  /**
   * Start a new thread with the agent. This will have a fresh history, though if
   * you pass in a userId you can have it search across other threads for relevant
   * messages as context for the LLM calls.
   * @param ctx The context of the Convex function. From an action, you can thread
   *   with the agent. From a mutation, you can start a thread and save the threadId
   *   to pass to continueThread later.
   * @param args The thread metadata.
   * @returns The threadId of the new thread and the thread object.
   */
  async createThread(
    ctx: RunActionCtx,
    args?: {
      /**
       * The userId to associate with the thread. If not provided, the thread will be
       * anonymous.
       */
      userId?: string;
      /**
       * The parent threadIds to merge with.
       * If the thread is a continuation of one or many previous threads,
       * you can pass in the threadIds of the parent threads to merge the histories.
       */
      parentThreadIds?: string[];
      /**
       * The title of the thread. Not currently used.
       */
      title?: string;
      /**
       * The summary of the thread. Not currently used.
       */
      summary?: string;
    }
  ): Promise<{
    threadId: string;
    thread: Thread<AgentTools>;
  }>;
  /**
   * Start a new thread with the agent. This will have a fresh history, though if
   * you pass in a userId you can have it search across other threads for relevant
   * messages as context for the LLM calls.
   * @param ctx The context of the Convex function. From a mutation, you can
   * start a thread and save the threadId to pass to continueThread later.
   * @param args The thread metadata.
   * @returns The threadId of the new thread.
   */
  async createThread(
    ctx: RunMutationCtx,
    args?: {
      userId?: string;
      parentThreadIds?: string[];
      title?: string;
      summary?: string;
    }
  ): Promise<{
    threadId: string;
  }>;
  async createThread(
    ctx: RunActionCtx | RunMutationCtx,
    args?: {
      userId: string;
      parentThreadIds?: string[];
      title?: string;
      summary?: string;
    }
  ): Promise<{
    threadId: string;
    thread?: Thread<AgentTools>;
  }> {
    const threadDoc = await ctx.runMutation(
      this.component.messages.createThread,
      {
        defaultSystemPrompt: this.options.instructions,
        userId: args?.userId,
        title: args?.title,
        summary: args?.summary,
        parentThreadIds: args?.parentThreadIds,
      }
    );
    if (!("runAction" in ctx)) {
      return { threadId: threadDoc._id };
    }
    const { thread } = await this.continueThread(ctx, {
      threadId: threadDoc._id,
      userId: args?.userId,
    });
    return {
      threadId: threadDoc._id,
      thread,
    };
  }

  async continueThread(
    ctx: RunActionCtx,
    {
      threadId,
      userId,
    }: {
      threadId: string;
      /**
       * If supplied, the userId can be used to search across other threads for
       * relevant messages from the same user as context for the LLM calls.
       */
      userId?: string;
    }
  ): Promise<{
    thread: Thread<AgentTools>;
  }> {
    // return this.component.continueThread(ctx, args);
    return {
      thread: {
        threadId,
        generateText: this.generateText.bind(this, ctx, { userId, threadId }),
        streamText: this.streamText.bind(this, ctx, { userId, threadId }),
        generateObject: this.generateObject.bind(this, ctx, {
          userId,
          threadId,
        }),
        streamObject: this.streamObject.bind(this, ctx, { userId, threadId }),
      } as Thread<AgentTools>,
    };
  }

  async fetchContextMessages(
    ctx: RunQueryCtx | RunActionCtx,
    args: {
      userId?: string;
      threadId?: string;
      messages: CoreMessage[];
      parentMessageId?: string;
    } & ContextOptions
  ): Promise<CoreMessage[]> {
    assert(args.userId || args.threadId, "Specify userId or threadId");
    // Fetch the latest messages from the thread
    const contextMessages: CoreMessage[] = [];
    let included: Set<string> | undefined;
    const opts = this.mergedContextOptions(args);
    if (opts.searchOptions?.textSearch || opts.searchOptions?.vectorSearch) {
      if (!("runAction" in ctx)) {
        throw new Error("searchUserMessages only works in an action");
      }
      const searchMessages = await ctx.runAction(
        this.component.messages.searchMessages,
        {
          userId: args.searchOtherThreads ? args.userId : undefined,
          threadId: args.threadId,
          parentMessageId: args.parentMessageId,
          ...(await this.searchOptionsWithDefaults(opts, args.messages)),
        }
      );
      // TODO: track what messages we used for context
      included = new Set(searchMessages.map((m) => m._id));
      contextMessages.push(...searchMessages.map((m) => m.message!));
    }
    if (args.threadId) {
      const { page } = await ctx.runQuery(
        this.component.messages.getThreadMessages,
        {
          threadId: args.threadId,
          isTool: args.includeToolCalls ?? false,
          paginationOpts: {
            numItems:
              args.recentMessages ??
              this.options.contextOptions?.recentMessages ??
              DEFAULT_RECENT_MESSAGES,
            cursor: null,
          },
          parentMessageId: args.parentMessageId,
          order: "desc",
          statuses: ["success"],
        }
      );
      contextMessages.push(
        ...page.filter((m) => !included?.has(m._id)).map((m) => m.message!)
      );
    }
    return contextMessages;
  }

  async getEmbeddings(messages: CoreMessage[]) {
    let embeddings:
      | {
          vectors: (number[] | null)[];
          dimension: VectorDimension;
          model: string;
        }
      | undefined;
    if (this.options.textEmbedding) {
      const messageTexts = messages.map((m) => extractText(m));
      // Find the indexes of the messages that have text.
      const textIndexes = messageTexts
        .map((t, i) => (t ? i : undefined))
        .filter((i) => i !== undefined);
      if (textIndexes.length === 0) {
        return undefined;
      }
      // Then embed those messages.
      const textEmbeddings = await this.options.textEmbedding.doEmbed({
        values: messageTexts.filter((t): t is string => !!t),
      });
      // Then assemble the embeddings into a single array with nulls for the messages without text.
      const embeddingsOrNull = Array(messages.length).fill(null);
      textIndexes.forEach((i, j) => {
        embeddingsOrNull[i] = textEmbeddings.embeddings[j];
      });
      if (textEmbeddings.embeddings.length > 0) {
        const dimension = textEmbeddings.embeddings[0].length;
        validateVectorDimension(dimension);
        embeddings = {
          vectors: embeddingsOrNull,
          dimension,
          model: this.options.textEmbedding.modelId,
        };
      }
    }
    return embeddings;
  }

  async saveMessages(
    ctx: RunMutationCtx,
    args: {
      threadId: string;
      userId?: string;
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
      threadId: args.threadId,
      userId: args.userId,
      agentName: this.options.name,
      model: this.options.chat.modelId,
      messages: args.messages.map(serializeMessageWithId),
      embeddings: await this.getEmbeddings(args.messages),
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
    args: { threadId: string; messageId: string; step: StepResult<TOOLS> }
  ): Promise<void> {
    const step = serializeStep(args.step as StepResult<ToolSet>);
    const messages = serializeNewMessagesInStep(args.step);
    await ctx.runMutation(this.component.messages.addStep, {
      threadId: args.threadId,
      messageId: args.messageId,
      step: { step, messages },
      failPendingSteps: false,
      embeddings: await this.getEmbeddings(messages.map((m) => m.message)),
    });
  }

  // If you manually create a message, call this to either commit or reset it.
  async completeMessage<TOOLS extends ToolSet>(
    ctx: RunMutationCtx,
    args: {
      threadId: string;
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
      await ctx.runMutation(this.component.messages.rollbackMessage, {
        messageId: args.messageId,
        error: result.error,
      });
    }
  }

  /**
   * This behaves like {@link generateText} except that it add context based on
   * the userId and threadId. It saves the input and resulting messages to the
   * thread, if specified.
   * however. To do that, use {@link continueThread} or {@link saveMessages}.
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
      threadId,
    }: {
      userId?: string;
      threadId?: string;
    },
    args: TextArgs<
      AgentTools,
      TOOLS,
      Parameters<typeof generateText<TOOLS, OUTPUT, OUTPUT_PARTIAL>>[0]
    >
  ): Promise<
    GenerateTextResult<TOOLS & AgentTools, OUTPUT> & GenerationOutputMetadata
  > {
    const { args: aiArgs, messageId } = await this.saveMessagesAndFetchContext(
      ctx,
      { ...args, userId, threadId }
    );
    const toolCtx = { ...ctx, userId, threadId, messageId };
    const tools = wrapTools(toolCtx, this.options.tools, args.tools) as TOOLS;
    const maxSteps = args.maxSteps ?? this.options.maxSteps;
    try {
      const result = await generateText({
        model: this.options.chat,
        ...aiArgs,
        maxSteps,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toolChoice: args.toolChoice as any,
        tools,
        onStepFinish: async (step) => {
          if (threadId && messageId && args.saveOutputMessages !== false) {
            await this.saveStep(ctx, {
              threadId,
              messageId,
              step,
            });
          }
          return args.onStepFinish?.(step);
        },
      });
      return { ...result, messageId };
    } catch (error) {
      if (threadId && messageId) {
        console.error("RollbackMessage", messageId);
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
    { userId, threadId }: { userId?: string; threadId?: string },
    args: TextArgs<
      AgentTools,
      TOOLS,
      Parameters<typeof streamText<TOOLS, OUTPUT, PARTIAL_OUTPUT>>[0]
    >
  ): Promise<
    StreamTextResult<TOOLS, PARTIAL_OUTPUT> & GenerationOutputMetadata
  > {
    const { args: aiArgs, messageId } = await this.saveMessagesAndFetchContext(
      ctx,
      { ...args, userId, threadId }
    );
    const toolCtx = { ...ctx, userId, threadId, messageId };
    const tools = wrapTools(toolCtx, this.options.tools, args.tools) as TOOLS;
    const maxSteps = args.maxSteps ?? this.options.maxSteps;
    const result = streamText({
      model: this.options.chat,
      ...aiArgs,
      maxSteps,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toolChoice: args.toolChoice as any,
      tools,
      onChunk: async (chunk) => {
        // console.log("onChunk", chunk);
        return args.onChunk?.(chunk);
      },
      onError: async (error) => {
        console.error("onError", error);
        if (threadId && messageId && args.saveOutputMessages !== false) {
          await ctx.runMutation(this.component.messages.rollbackMessage, {
            messageId,
            error: (error.error as Error).message,
          });
        }
        return args.onError?.(error);
      },
      onStepFinish: async (step) => {
        // console.log("onStepFinish", step);
        // TODO: compare delta to the output. internally drop the deltas when committing
        if (threadId && messageId) {
          await this.saveStep(ctx, {
            threadId,
            messageId,
            step,
          });
        }
        return args.onStepFinish?.(step);
      },
    });
    return { ...result, messageId };
  }

  async saveMessagesAndFetchContext<
    T extends {
      prompt?: string;
      messages?: CoreMessage[] | Omit<UIMessage, "id">[];
      system?: string;
    },
  >(
    ctx: RunActionCtx | RunMutationCtx,
    {
      userId,
      threadId,
      parentMessageId,
      saveAllInputMessages,
      system,
      ...args
    }: {
      userId: string | undefined;
      threadId: string | undefined;
      parentMessageId?: string;
      saveAllInputMessages?: boolean;
      saveAnyInputMessages?: boolean;
    } & ContextOptions &
      T
  ): Promise<{
    args: T;
    messageId: string | undefined;
  }> {
    const messages = promptOrMessagesToCoreMessages(args);
    const contextMessages = await this.fetchContextMessages(ctx, {
      messages,
      parentMessageId,
      userId,
      threadId,
      ...args,
    });
    let messageId: string | undefined;
    if (threadId) {
      const saved = await this.saveMessages(ctx, {
        threadId,
        userId,
        messages: saveAllInputMessages ? messages : messages.slice(-1),
        pending: true,
        // We should just fail if you pass in an ID for the message, fail those children
        // failPendingSteps: true,
        parentMessageId,
      });
      messageId = saved.lastMessageId;
    }
    const { prompt: _, ...rest } = args;
    return {
      args: {
        ...rest,
        system: system ?? this.options.instructions,
        messages: [...contextMessages, ...messages],
      } as T,
      messageId,
    };
  }

  async generateObject<T>(
    ctx: RunActionCtx,
    { userId, threadId }: { userId?: string; threadId?: string },
    args: OurObjectArgs<T>
  ): Promise<GenerateObjectResult<T> & GenerationOutputMetadata> {
    const { args: aiArgs, messageId } = await this.saveMessagesAndFetchContext(
      ctx,
      { ...args, userId, threadId }
    );

    try {
      const result = (await generateObject({
        model: this.options.chat,
        ...aiArgs,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)) as GenerateObjectResult<T>;

      if (threadId && messageId && args.saveOutputMessages !== false) {
        await this.saveObject(ctx, { threadId, messageId, result });
      }
      return { ...result, messageId };
    } catch (error) {
      if (threadId && messageId) {
        await ctx.runMutation(this.component.messages.rollbackMessage, {
          messageId,
          error: (error as Error).message,
        });
      }
      throw error;
    }
  }

  async streamObject<T>(
    ctx: RunMutationCtx,
    { userId, threadId }: { userId?: string; threadId?: string },
    args: OurStreamObjectArgs<T>
  ): Promise<
    StreamObjectResult<DeepPartial<T>, T, never> & GenerationOutputMetadata
  > {
    // TODO: unify all this shared code between all the generate* and stream* functions
    const { args: aiArgs, messageId } = await this.saveMessagesAndFetchContext(
      ctx,
      { ...args, userId, threadId }
    );
    const stream = streamObject<T>({
      model: this.options.chat,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(aiArgs as any),
      onError: async (error) => {
        console.error("onError", error);
        return args.onError?.(error);
      },
      onFinish: async (result) => {
        if (threadId && messageId && args.saveOutputMessages !== false) {
          await this.saveObject(ctx, {
            threadId,
            messageId,
            result: {
              object: result.object,
              finishReason: "stop",
              usage: result.usage,
              warnings: result.warnings,
              request: await stream.request,
              response: result.response,
              providerMetadata: result.providerMetadata,
              experimental_providerMetadata:
                result.experimental_providerMetadata,
              logprobs: undefined,
              toJsonResponse: stream.toTextStreamResponse,
            },
          });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return args.onFinish?.(result as any);
      },
    }) as StreamObjectResult<DeepPartial<T>, T, never>;
    return { ...stream, messageId };
  }

  async saveObject(
    ctx: RunMutationCtx,
    args: {
      threadId: string;
      messageId: string;
      result: GenerateObjectResult<unknown>;
    }
  ): Promise<void> {
    const step = serializeObjectResult(args.result);
    await ctx.runMutation(this.component.messages.addStep, {
      threadId: args.threadId,
      messageId: args.messageId,
      failPendingSteps: false,
      embeddings: await this.getEmbeddings([step.messages[0].message]),
      step,
    });
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

  /**
   *
   */
  asAction(spec?: { contextOptions?: ContextOptions; maxSteps?: number }) {
    return internalActionGeneric({
      args: {
        userId: v.optional(v.string()),
        threadId: v.optional(v.string()),
        contextOptions: v.optional(vContextOptions),
        storageOptions: v.optional(vStorageOptions),
        maxRetries: v.optional(v.number()),
        parentMessageId: v.optional(v.string()),

        createThread: v.optional(
          v.object({
            userId: v.optional(v.string()),
            parentThreadIds: v.optional(v.array(v.string())),
            title: v.optional(v.string()),
            summary: v.optional(v.string()),
          })
        ),
        generateText: v.optional(vTextArgs),
        streamText: v.optional(vTextArgs),
        generateObject: v.optional(vSafeObjectArgs),
        streamObject: v.optional(vSafeObjectArgs),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handler: async (ctx, args): Promise<any> => {
        const contextOptions =
          spec?.contextOptions &&
          this.mergedContextOptions(spec.contextOptions);
        const maxSteps = spec?.maxSteps ?? this.options.maxSteps;
        const commonArgs = {
          userId: args.userId,
          threadId: args.threadId,
          parentMessageId: args.parentMessageId,
          ...contextOptions,
          ...args.storageOptions,
        };
        if (args.createThread) {
          const { threadId } = await this.createThread(ctx, {
            userId: args.createThread.userId,
            parentThreadIds: args.createThread.parentThreadIds,
            title: args.createThread.title,
            summary: args.createThread.summary,
          });
          return threadId;
        } else if (args.generateText) {
          const value = await this.generateText(ctx, commonArgs, {
            ...args.generateText,
            maxSteps: args.generateText.maxSteps ?? maxSteps,
          });
          return value.text;
        } else if (args.streamText) {
          const value = await this.streamText(ctx, commonArgs, {
            ...args.streamText,
            maxSteps: args.streamText.maxSteps ?? maxSteps,
          });
          return value.text;
        } else if (args.generateObject) {
          const value = await this.generateObject(ctx, commonArgs, {
            ...(args.generateObject as GenerateObjectArgs<unknown>),
          });
          return value.object;
        } else if (args.streamObject) {
          const value = await this.streamObject(ctx, commonArgs, {
            ...(args.streamObject as StreamObjectArgs<unknown>),
          });
          return value.object;
        } else {
          throw new Error(
            "No action specified. Maybe try :" +
              'generateText: { prompt: "Hello world" }'
          );
        }
      },
    });
  }

  /**
   * Create a tool that can call this agent.
   * @param spec The specification for the arguments to this agent.
   *   They will be encoded as JSON and passed to the agent.
   * @returns The agent as a tool that can be passed to other agents.
   */
  asTool(spec: {
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
          { userId: ctx.userId, threadId: ctx.threadId },
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
  threadId?: string;
  messageId?: string;
};

/**
 * This is a wrapper around the ai.tool function that adds support for
 * userId and threadId to the tool, if they're called within a thread from an agent.
 * @param tool The AI tool. See https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling
 * @returns The same tool, but with userId and threadId args support added.
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
            " call it (which injects the ctx, userId and threadId)"
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

type BaseGenerateObjectOptions = StorageOptions &
  ContextOptions &
  CallSettings & {
    model?: LanguageModelV1;
    parentMessageId?: string;
    system?: string;
    prompt?: string;
    messages?: CoreMessage[];
    experimental_repairText?: RepairTextFunction;
    experimental_telemetry?: TelemetrySettings;
    providerOptions?: ProviderOptions;
    experimental_providerMetadata?: ProviderMetadata;
  };

type GenerateObjectObjectOptions<T extends Record<string, unknown>> =
  BaseGenerateObjectOptions & {
    output: "object";
    mode?: "auto" | "json" | "tool";
    schema: z.Schema<T>;
    schemaName?: string;
    schemaDescription?: string;
  };

type GenerateObjectArrayOptions<T> = BaseGenerateObjectOptions & {
  output: "array";
  mode?: "auto" | "json" | "tool";
  schema: z.Schema<T>;
  schemaName?: string;
  schemaDescription?: string;
};

type GenerateObjectWithEnumOptions<T extends string> =
  BaseGenerateObjectOptions & {
    output: "enum";
    enum: Array<T>;
    mode?: "auto" | "json" | "tool";
  };

type GenerateObjectNoSchemaOptions = BaseGenerateObjectOptions & {
  schema?: undefined;
  mode?: "json";
};

type GenerateObjectArgs<T> =
  T extends Record<string, unknown>
    ? GenerateObjectObjectOptions<T>
    : T extends Array<unknown>
      ? GenerateObjectArrayOptions<T>
      : T extends string
        ? GenerateObjectWithEnumOptions<T>
        : GenerateObjectNoSchemaOptions;

type StreamObjectArgs<T> =
  T extends Record<string, unknown>
    ? GenerateObjectObjectOptions<T>
    : T extends Array<unknown>
      ? GenerateObjectArrayOptions<T>
      : GenerateObjectNoSchemaOptions;

type OurObjectArgs<T> = GenerateObjectArgs<T> &
  Pick<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Parameters<typeof generateObject<any>>[0],
    "experimental_repairText" | "abortSignal"
  >;

type OurStreamObjectArgs<T> = StreamObjectArgs<T> &
  Pick<
    Parameters<typeof streamObject<T>>[0],
    "onError" | "onFinish" | "abortSignal"
  >;

interface Thread<AgentTools extends ToolSet> {
  threadId: string;
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
    args: OurObjectArgs<T>
  ): Promise<GenerateObjectResult<T> & GenerationOutputMetadata>;
  generateObject(
    args: GenerateObjectNoSchemaOptions
  ): Promise<GenerateObjectResult<JSONValue> & GenerationOutputMetadata>;
  streamObject<T>(
    args: OurStreamObjectArgs<T>
  ): Promise<
    StreamObjectResult<DeepPartial<T>, T, never> & GenerationOutputMetadata
  >;
}
