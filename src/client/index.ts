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
} from "ai";
import {
  generateObject,
  generateText,
  jsonSchema,
  streamObject,
  streamText,
} from "ai";
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
  AIMessageWithoutId,
  deserializeMessage,
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
import { RunActionCtx, RunMutationCtx, RunQueryCtx, UseApi } from "./types.js";

export { convexToZod, zodToConvex };
export type { ThreadDoc, MessageDoc } from "./types.js";

/**
 * Options to configure what messages are fetched as context,
 * automatically with thread.generateText, or directly via search.
 */
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

/**
 * Options to configure the automatic saving of messages
 * when generating text / objects in a thread.
 */
export type StorageOptions = {
  /**
   * Defaults to false, allowing you to pass in arbitrary context that will
   * be in addition to automatically fetched content.
   * Pass true to have all input messages saved to the thread history.
   */
  saveAllInputMessages?: boolean;
  /** Defaults to true, saving the prompt, or last message passed to generateText. */
  saveAnyInputMessages?: boolean;
  /** Defaults to true. Whether to save messages generated while chatting. */
  saveOutputMessages?: boolean;
};

export type GenerationOutputMetadata = { messageId?: string };

type CoreMessageMaybeWithId = CoreMessage & { id?: string | undefined };

export class Agent<AgentTools extends ToolSet> {
  constructor(
    public component: UseApi<Mounts>,
    public options: {
      /**
       * The name for the agent. This will be attributed on each message
       * created by this agent.
       */
      name?: string;
      /**
       * The LLM model to use for generating / streaming text and objects.
       * e.g.
       * import { openai } from "@ai-sdk/openai"
       * const myAgent = new Agent(components.agent, {
       *   chat: openai.chat("gpt-4o-mini"),
       */
      chat: LanguageModelV1;
      /**
       * The model to use for text embeddings. Optional.
       * If specified, it will use this for generating vector embeddings
       * of chats, and can opt-in to doing vector search for automatic context
       * on generateText, etc.
       * e.g.
       * import { openai } from "@ai-sdk/openai"
       * const myAgent = new Agent(components.agent, {
       *   textEmbedding: openai.embedding("text-embedding-3-small")
       */
      textEmbedding?: EmbeddingModelV1<string>;
      /**
       * The default system prompt to put in each request.
       * Override per-prompt by passing the "system" parameter.
       */
      instructions?: string;
      /**
       * Tools that the agent can call out to and get responses from.
       * They can be AI SDK tools (import {tool} from "ai")
       * or tools that have Convex context
       * (import { createTool } from "@convex-dev/agent")
       * Note: Convex tools can't currently annotate the parameters
       * with descriptions, so the names should be self-evident from naming.
       */
      tools?: AgentTools;
      /**
       * Options to determine what messages are included as context in message
       * generation. To disable any messages automatically being added, pass:
       * { recentMessages: 0 }
       */
      contextOptions?: ContextOptions;
      /**
       * Determines whether messages are automatically stored when passed as
       * arguments or generated.
       */
      storageOptions?: StorageOptions;
      /**
       * When generating or streaming text with tools available, this
       * determines the default max number of iterations.
       */
      maxSteps?: number;
      /**
       * The maximum number of calls to make to an LLM in case it fails.
       * This can be overridden at each generate/stream callsite.
       */
      maxRetries?: number;
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

  /**
   * Continues a thread using this agent. Note: threads can be continued
   * by different agents. This is a convenience around calling the various
   * generate and stream functions with explicit userId and threadId parameters.
   * @param ctx The ctx object passed to the action handler
   * @param { threadId, userId }: the thread and user to associate the messages with.
   * @returns Functions bound to the userId and threadId on a `{thread}` object.
   */
  /**
   * Continues a thread using this agent. Note: threads can be continued
   * by different agents. This is a convenience around calling the various
   * generate and stream functions with explicit userId and threadId parameters.
   * @param ctx The ctx object passed to the action handler
   * @param { threadId, userId }: the thread and user to associate the messages with.
   * @returns Functions bound to the userId and threadId on a `{thread}` object.
   */
  async continueThread(
    ctx: RunActionCtx,
    {
      threadId,
      userId,
    }: {
      /**
       * The associated thread created by {@link createThread}
       */
      /**
       * The associated thread created by {@link createThread}
       */
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

  /**
   *
   * @param ctx Either a query, mutation, or action ctx.
   *   If it is not an action context, you can't do text or
   *   vector search.
   * @param args The associated thread, user, message
   * @returns
   */
  /**
   *
   * @param ctx Either a query, mutation, or action ctx.
   *   If it is not an action context, you can't do text or
   *   vector search.
   * @param args The associated thread, user, message
   * @returns
   */
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
      contextMessages.push(
        ...searchMessages.map((m) => deserializeMessage(m.message!))
      );
    }
    if (args.threadId && opts.recentMessages !== 0) {
      const { page } = await ctx.runQuery(
        this.component.messages.getThreadMessages,
        {
          threadId: args.threadId,
          isTool: args.includeToolCalls ?? false,
          paginationOpts: {
            numItems: opts.recentMessages ?? DEFAULT_RECENT_MESSAGES,
            cursor: null,
          },
          parentMessageId: args.parentMessageId,
          order: "desc",
          statuses: ["success"],
        }
      );
      contextMessages.push(
        ...page
          .filter((m) => !included?.has(m._id))
          .map((m) => deserializeMessage(m.message!))
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

  /**
   * Explicitly save messages associated with the thread (& user if provided)
   * @param ctx The ctx parameter to a mutation or action.
   * @param args The messages and context to save
   * @returns
   */
  /**
   * Explicitly save messages associated with the thread (& user if provided)
   * @param ctx The ctx parameter to a mutation or action.
   * @param args The messages and context to save
   * @returns
   */
  async saveMessages(
    ctx: RunMutationCtx,
    args: {
      threadId: string;
      userId?: string;
      messages: CoreMessageMaybeWithId[];
      /**
       * If false, it will "commit" the messages immediately.
       * If true, it will mark them as pending until the final step has finished.
       */
      /**
       * If false, it will "commit" the messages immediately.
       * If true, it will mark them as pending until the final step has finished.
       */
      pending?: boolean;
      /**
       * The message that this is responding to.
       */
      /**
       * The message that this is responding to.
       */
      parentMessageId?: string;
      /**
       * Whether to mark all pending messages in the thread as failed.
       * This is used to recover from a failure via a retry that wipes the slate clean.
       */
      /**
       * Whether to mark all pending messages in the thread as failed.
       * This is used to recover from a failure via a retry that wipes the slate clean.
       */
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

  /**
   * Explicitly save a "step" created by the AI SDK.
   * @param ctx The ctx argument to a mutation or action.
   * @param args What to save
   */
  /**
   * Explicitly save a "step" created by the AI SDK.
   * @param ctx The ctx argument to a mutation or action.
   * @param args What to save
   */
  async saveStep<TOOLS extends ToolSet>(
    ctx: RunMutationCtx,
    args: {
      threadId: string;
      /**
       * The message this step is in response to.
       */
      messageId: string;
      /**
       * The step to save, possibly including multiple tool calls.
       */
      step: StepResult<TOOLS>;
    }
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

  /**
   * Commit or rollback a message that was pending.
   * This is done automatically when saving messages by default.
   * If creating pending messages, you can call this when the full "transaction" is done.
   * @param ctx The ctx argument to your mutation or action.
   * @param args What message to save. Generally the parent message sent into
   *   the generateText call.
   */
  /**
   * Commit or rollback a message that was pending.
   * This is done automatically when saving messages by default.
   * If creating pending messages, you can call this when the full "transaction" is done.
   * @param ctx The ctx argument to your mutation or action.
   * @param args What message to save. Generally the parent message sent into
   *   the generateText call.
   */
  async completeMessage(
    ctx: RunMutationCtx,
    args: {
      threadId: string;
      messageId: string;
      result: { kind: "error"; error: string } | { kind: "success" };
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
   * This behaves like {@link generateText} from the "ai" package except that
   * it add context based on the userId and threadId and saves the input and
   * resulting messages to the thread, if specified.
   * Use {@link continueThread} to get a version of this function already scoped
   * to a thread (and optionally userId).
   * @param ctx The context passed from the action function calling this.
   * @param { userId, threadId }: The user and thread to associate the message with
   * @param args The arguments to the generateText function, along with extra controls
   * for the {@link ContextOptions} and {@link StorageOptions}.
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
    const saveOutputMessages =
      args.saveOutputMessages ??
      this.options.storageOptions?.saveOutputMessages;
    try {
      const result = (await generateText({
        // Can be overridden
        model: this.options.chat,
        maxSteps: this.options.maxSteps,
        maxRetries: this.options.maxRetries,
        ...aiArgs,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toolChoice: args.toolChoice as any,
        tools,
        onStepFinish: async (step) => {
          if (threadId && messageId && saveOutputMessages !== false) {
            await this.saveStep(ctx, {
              threadId,
              messageId,
              step,
            });
          }
          return args.onStepFinish?.(step);
        },
      })) as GenerateTextResult<TOOLS, OUTPUT> & GenerationOutputMetadata;
      result.messageId = messageId;
      return result;
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

  /**
   * This behaves like {@link streamText} from the "ai" package except that
   * it add context based on the userId and threadId and saves the input and
   * resulting messages to the thread, if specified.
   * Use {@link continueThread} to get a version of this function already scoped
   * to a thread (and optionally userId).
   * @param ctx The context passed from the action function calling this.
   * @param { userId, threadId }: The user and thread to associate the message with
   * @param args The arguments to the streamText function, along with extra controls
   * for the {@link ContextOptions} and {@link StorageOptions}.
   * @returns The result of the streamText function.
   */
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
    const saveOutputMessages =
      args.saveOutputMessages ??
      this.options.storageOptions?.saveOutputMessages;
    const result = streamText({
      // Can be overridden
      model: this.options.chat,
      maxSteps: this.options.maxSteps,
      maxRetries: this.options.maxRetries,
      ...aiArgs,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toolChoice: args.toolChoice as any,
      tools,
      onChunk: async (chunk) => {
        // console.log("onChunk", chunk);
        return args.onChunk?.(chunk);
      },
      onError: async (error) => {
        console.error("onError", error);
        if (threadId && messageId && saveOutputMessages !== false) {
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
    }) as StreamTextResult<TOOLS, PARTIAL_OUTPUT> & GenerationOutputMetadata;
    result.messageId = messageId;
    return result;
  }

  async saveMessagesAndFetchContext<
    T extends {
      prompt?: string;
      messages?: CoreMessage[] | AIMessageWithoutId[];
      system?: string;
    },
  >(
    ctx: RunActionCtx | RunMutationCtx,
    {
      userId,
      threadId,
      parentMessageId,
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
    const saveAny =
      args.saveAnyInputMessages ??
      this.options.storageOptions?.saveAnyInputMessages;
    const saveAll =
      args.saveAllInputMessages ??
      this.options.storageOptions?.saveAllInputMessages;
    const messages = promptOrMessagesToCoreMessages(args);
    const contextMessages = await this.fetchContextMessages(ctx, {
      messages,
      parentMessageId,
      userId,
      threadId,
      ...args,
    });
    let messageId: string | undefined;
    if (threadId && saveAny !== false) {
      const saved = await this.saveMessages(ctx, {
        threadId,
        userId,
        messages: saveAll ? messages : messages.slice(-1),
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

  /**
   * This behaves like {@link generateObject} from the "ai" package except that
   * it add context based on the userId and threadId and saves the input and
   * resulting messages to the thread, if specified.
   * Use {@link continueThread} to get a version of this function already scoped
   * to a thread (and optionally userId).
   * @param ctx The context passed from the action function calling this.
   * @param { userId, threadId }: The user and thread to associate the message with
   * @param args The arguments to the generateObject function, along with extra controls
   * for the {@link ContextOptions} and {@link StorageOptions}.
   * @returns The result of the generateObject function.
   */
  async generateObject<T>(
    ctx: RunActionCtx,
    { userId, threadId }: { userId?: string; threadId?: string },
    args: OurObjectArgs<T>
  ): Promise<GenerateObjectResult<T> & GenerationOutputMetadata> {
    const { args: aiArgs, messageId } = await this.saveMessagesAndFetchContext(
      ctx,
      { ...args, userId, threadId }
    );

    const saveOutputMessages =
      args.saveOutputMessages ??
      this.options.storageOptions?.saveOutputMessages;
    try {
      const result = (await generateObject({
        // Can be overridden
        model: this.options.chat,
        maxRetries: this.options.maxRetries,
        ...aiArgs,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)) as GenerateObjectResult<T> & GenerationOutputMetadata;

      if (threadId && messageId && saveOutputMessages !== false) {
        await this.saveObject(ctx, { threadId, messageId, result });
      }
      result.messageId = messageId;
      return result;
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

  /**
   * This behaves like {@link streamObject} from the "ai" package except that
   * it add context based on the userId and threadId and saves the input and
   * resulting messages to the thread, if specified.
   * Use {@link continueThread} to get a version of this function already scoped
   * to a thread (and optionally userId).
   * @param ctx The context passed from the action function calling this.
   * @param { userId, threadId }: The user and thread to associate the message with
   * @param args The arguments to the streamObject function, along with extra controls
   * for the {@link ContextOptions} and {@link StorageOptions}.
   * @returns The result of the streamObject function.
   */
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
    const saveOutputMessages =
      args.saveOutputMessages ??
      this.options.storageOptions?.saveOutputMessages;
    const stream = streamObject<T>({
      // Can be overridden
      model: this.options.chat,
      maxRetries: this.options.maxRetries,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(aiArgs as any),
      onError: async (error) => {
        console.error("onError", error);
        return args.onError?.(error);
      },
      onFinish: async (result) => {
        if (threadId && messageId && saveOutputMessages !== false) {
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
    }) as StreamObjectResult<DeepPartial<T>, T, never> &
      GenerationOutputMetadata;
    stream.messageId = messageId;
    return stream;
  }

  /**
   * Manually save the result of a generateObject call to the thread.
   * This happens automatically when using {@link generateObject} or {@link streamObject}
   * from the `thread` object created by {@link continueThread} or {@link createThread}.
   * @param ctx The context passed from the mutation or action function calling this.
   * @param args The arguments to the saveObject function.
   */
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
   * Create an action out of this agent so you can call it from workflows or other actions
   * without a wrapping function.
   * Note: currently this is not well typed. The return type of the action is always `any`.
   * @param spec Configuration for the agent acting as an action, including
   *   {@link ContextOptions} and maxSteps.
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
          await value.consumeStream();
          return await value.text;
        } else if (args.generateObject) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { schema, ...rest } = args.generateObject as { schema?: any };
          const value = await this.generateObject(ctx, commonArgs, {
            ...rest,
            schema: jsonSchema(schema),
          } as unknown as OurObjectArgs<unknown>);
          return value.object;
        } else if (args.streamObject) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { schema, ...rest } = args.streamObject as { schema?: any };
          const value = await this.streamObject(ctx, commonArgs, {
            ...rest,
            schema: jsonSchema(schema),
          } as unknown as OurStreamObjectArgs<unknown>);
          for await (const _ of value.fullStream) {
            // no-op, just consume the stream
          }
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
   * Create a tool out of this agent so other agents can call this one.
   * Create a tool out of this agent so other agents can call this one.
   * @param spec The specification for the arguments to this agent.
   *   They will be encoded as JSON and passed to the agent.
   * @returns The agent as a tool that can be passed to other agents.
   */
  asTool(spec: {
    description: string;
    args: Validator<unknown, "required", string>;
    contextOptions?: ContextOptions;
    maxSteps?: number;
    provideMessageHistory?: boolean;
  }) {
    return createTool({
      ...spec,
      handler: async (ctx, args, options) => {
        const maxSteps = spec.maxSteps ?? this.options.maxSteps;
        const contextOptions =
          spec.contextOptions && this.mergedContextOptions(spec.contextOptions);
        const { thread } = await this.createThread(ctx, {
          parentThreadIds: ctx.threadId ? [ctx.threadId] : undefined,
          userId: ctx.userId,
        });
        const messages = spec.provideMessageHistory ? options.messages : [];
        messages.push({
          role: "user",
          content: JSON.stringify(args),
        });
        const value = await thread.generateText({
          messages,
          maxSteps,
          ...contextOptions,
        });
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
  /**
   * The target threadId, from the startThread or continueThread initializers.
   */
  threadId: string;
  /**
   * This behaves like {@link generateText} from the "ai" package except that
   * it add context based on the userId and threadId and saves the input and
   * resulting messages to the thread, if specified.
   * Use {@link continueThread} to get a version of this function already scoped
   * to a thread (and optionally userId).
   * @param args The arguments to the generateText function, along with extra controls
   * for the {@link ContextOptions} and {@link StorageOptions}.
   * @returns The result of the generateText function.
   */
  generateText<TOOLS extends ToolSet, OUTPUT = never, OUTPUT_PARTIAL = never>(
    args: TextArgs<
      AgentTools,
      TOOLS,
      Parameters<typeof generateText<TOOLS, OUTPUT, OUTPUT_PARTIAL>>[0]
    >
  ): Promise<
    GenerateTextResult<TOOLS & AgentTools, OUTPUT> & GenerationOutputMetadata
  >;

  /**
   * This behaves like {@link streamText} from the "ai" package except that
   * it add context based on the userId and threadId and saves the input and
   * resulting messages to the thread, if specified.
   * Use {@link continueThread} to get a version of this function already scoped
   * to a thread (and optionally userId).
   * @param args The arguments to the streamText function, along with extra controls
   * for the {@link ContextOptions} and {@link StorageOptions}.
   * @returns The result of the streamText function.
   */
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
  /**
   * This behaves like {@link generateObject} from the "ai" package except that
   * it add context based on the userId and threadId and saves the input and
   * resulting messages to the thread, if specified. This overload is for objects, arrays, and enums.
   * Use {@link continueThread} to get a version of this function already scoped
   * to a thread (and optionally userId).
   * @param args The arguments to the generateObject function, along with extra controls
   * for the {@link ContextOptions} and {@link StorageOptions}.
   * @returns The result of the generateObject function.
   */
  generateObject<T>(
    args: OurObjectArgs<T>
  ): Promise<GenerateObjectResult<T> & GenerationOutputMetadata>;
  /**
   * This behaves like {@link generateObject} from the "ai" package except that
   * it add context based on the userId and threadId and saves the input and
   * resulting messages to the thread, if specified. This overload is for when there's no schema.
   * Use {@link continueThread} to get a version of this function already scoped
   * to a thread (and optionally userId).
   * @param args The arguments to the generateObject function, along with extra controls
   * for the {@link ContextOptions} and {@link StorageOptions}.
   * @returns The result of the generateObject function.
   */
  generateObject(
    args: GenerateObjectNoSchemaOptions
  ): Promise<GenerateObjectResult<JSONValue> & GenerationOutputMetadata>;
  /**
   * This behaves like {@link streamObject} from the "ai" package except that
   * it add context based on the userId and threadId and saves the input and
   * resulting messages to the thread, if specified.
   * Use {@link continueThread} to get a version of this function already scoped
   * to a thread (and optionally userId).
   * @param args The arguments to the streamObject function, along with extra controls
   * for the {@link ContextOptions} and {@link StorageOptions}.
   * @returns The result of the streamObject function.
   */
  streamObject<T>(
    args: OurStreamObjectArgs<T>
  ): Promise<
    StreamObjectResult<DeepPartial<T>, T, never> & GenerationOutputMetadata
  >;
}
