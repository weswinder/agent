import { api } from "../component/_generated/api";
import { RunMutationCtx, RunQueryCtx, UseApi } from "./types";
import type { EmbeddingModelV1, LanguageModelV1 } from "@ai-sdk/provider";
import { MessageStatus, Step } from "../validators";
import type {
  StreamTextResult,
  Tool,
  ToolSet,
  StepResult,
  ToolExecutionOptions,
  Schema,
  Message,
  CoreMessage,
} from "ai";
import { z, ZodTypeAny } from "zod";
import {
  generateText,
  generateObject,
  streamText,
  streamObject,
  convertToCoreMessages,
  coreMessageSchema,
} from "ai";
import { assert } from "convex-helpers";
export class Agent<EmbeddingValue = string> {
  constructor(
    public component: UseApi<typeof api>,
    public options: {
      name?: string;
      languageModel: LanguageModelV1;
      embeddingModel: EmbeddingModelV1<EmbeddingValue>;
      defaultSystemPrompt?: string;
      tools?: Record<string, Tool>;
    }
  ) {}

  async startChat(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      private?: boolean;
      parentChatIds?: string[];
      title?: string;
      summary?: string;
    }
  ): Promise<{
    chatId: string;
    chat: Chat;
  }> {
    const chatDoc = await ctx.runMutation(this.component.messages.createChat, {
      defaultSystemPrompt: this.options.defaultSystemPrompt,
      domainId: args.userId,
      title: args.title,
      summary: args.summary,
    });
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
    ctx: RunMutationCtx,
    {
      chatId,
      userId,
    }: {
      chatId: string;
      userId: string;
    }
  ): Promise<{
    chat: Chat;
  }> {
    // return this.component.continueChat(ctx, args);
    return {
      chat: {
        generateText: this.generateText.bind(this, ctx, { userId, chatId }),
        streamText: this.streamText.bind(this, ctx, { userId, chatId }),
      } as Chat,
    };
  }

  async getContextualMessages(
    ctx: RunQueryCtx,
    args: {
      userId?: string;
      chatId?: string;
      system?: string;
      prompt?: string;
      messages?: CoreMessage[] | Omit<Message, "id">[];
    }
  ): Promise<{ messages: CoreMessage[] }> {
    assert(args.userId || args.chatId, "Specify userId or chatId");
    assert(args.messages || args.prompt, "Specify messages or prompt");
    return { messages: [] };
  }

  async saveMessages(
    ctx: RunMutationCtx,
    args: { chatId: string; messages: Message[] }
  ): Promise<void> {
    throw new Error("Not implemented");
  }

  async replaceMessages(
    ctx: RunMutationCtx,
    args: { chatId: string; messages: Message[] }
  ): Promise<void> {
    throw new Error("Not implemented");
  }

  async saveStep(
    ctx: RunMutationCtx,
    args: { chatId: string; messageId: string; step: StepResult<ToolSet> }
  ): Promise<void> {
    throw new Error("Not implemented");
  }

  async completeMessage(
    ctx: RunMutationCtx,
    args: {
      chatId: string;
      messageId: string;
      result:
        | { kind: "error"; error: string }
        | { kind: "success"; result: Response };
    }
  ): Promise<void> {
    throw new Error("Not implemented");
  }

  /**
   * This behaves like {@link generateText} except that it add context based on
   * the userId and chatId. It does not save the resulting message to the chat,
   * however. To do that, use {@link continueChat} or {@link saveMessages}.
   * @param ctx The context of the agent.
   * @param args The arguments to the generateText function.
   * @returns The result of the generateText function.
   */
  async generateText(
    ctx: RunMutationCtx,
    {
      userId,
      chatId,
    }: {
      userId?: string;
      chatId?: string;
    },
    args: Partial<Parameters<typeof generateText>[0]>
  ): Promise<{ text: string }> {
    const messageArgs =
      args.messages ?? args.prompt
        ? [{ role: "user", content: args.prompt }]
        : [];
    if (args.system) {
      messageArgs.unshift({
        role: "system",
        content: args.system,
      });
    }
    const msgIn =
      args.messages ?? args.prompt ? { prompt: args.prompt } : undefined;
    assert(msgIn, "Either prompt or messages must be provided");
    const mes = detect;
    const messages = await this.getContextualMessages(ctx, {
      userId: args.userId,
      chatId: args.chatId,
      system: args.system,
      prompt: args.prompt,
      messages: args.messages,
    });
    return generateText({
      model: this.options?.languageModel,
      system: this.options?.defaultSystemPrompt,
      ...args,
    });
  }

  convertToCoreMessages(args: {
    system?: string;
    prompt?: string;
    messages?: CoreMessage[] | Omit<Message, "id">[];
  }): CoreMessage[] {
    const messages: CoreMessage[] = [];
    if (args.system) {
      messages.push({ role: "system", content: args.system });
    }
    if (!args.messages) {
      assert(args.prompt, "messages or prompt is required");
      messages.push({ role: "user", content: args.prompt });
    } else if (
      args.messages.some(
        (m) =>
          typeof m === "object" &&
          m !== null &&
          (m.role === "data" || // UI-only role
            "toolInvocations" in m || // UI-specific field
            "parts" in m || // UI-specific field
            "experimental_attachments" in m)
      )
    ) {
      messages.push(...convertToCoreMessages(args.messages as Message[]));
    } else {
      messages.push(...coreMessageSchema.array().parse(args.messages));
    }
    assert(messages.length > 0, "Messages must contain at least one message");
    return messages;
  }

  async streamText<
    TOOLS extends ToolSet,
    OUTPUT = never,
    PARTIAL_OUTPUT = never,
  >(
    ctx: RunMutationCtx,
    { userId, chatId }: { userId?: string; chatId?: string },
    args: Partial<
      Parameters<typeof streamText<TOOLS, OUTPUT, PARTIAL_OUTPUT>>[0]
    >
  ): Promise<StreamTextResult<TOOLS, PARTIAL_OUTPUT>> {
    const messages = await this.getContextualMessages(ctx, {
      userId,
      chatId,
      prompt: args.prompt,
      messages: args.messages,
    });
    return streamText({
      model: this.options!.languageModel!,
      ...args,
      onChunk: async (chunk) => {
        console.log("onChunk", chunk);
        return args.onChunk?.(chunk);
      },
      onError: async (error) => {
        console.error("onError", error);
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
        return args.onStepFinish?.(step);
      },
    });
  }

  async getMessages(
    ctx: RunQueryCtx,
    args: { chatId: string; limit?: number; statuses?: MessageStatus[] }
  ): Promise<{
    messages: Message[];
  }> {
    return { messages: [] };
  }

  async getSteps(
    ctx: RunQueryCtx,
    args: { messageId: string }
  ): Promise<{
    steps: Step[];
  }> {
    return { steps: [] };
  }
}

interface Chat {
  generateText(args: Partial<Parameters<typeof generateText>[0]>): Promise<{
    text: string;
  }>;
  streamText<TOOLS extends ToolSet, OUTPUT = never, PARTIAL_OUTPUT = never>(
    args: Partial<
      Parameters<typeof streamText<TOOLS, OUTPUT, PARTIAL_OUTPUT>>[0]
    >
  ): Promise<StreamTextResult<TOOLS, PARTIAL_OUTPUT>>;
}

type ToolParameters = ZodTypeAny | Schema<unknown>; // TODO: support convex validator
type inferParameters<PARAMETERS extends ToolParameters> =
  PARAMETERS extends Schema<unknown>
    ? PARAMETERS["_type"]
    : PARAMETERS extends z.ZodTypeAny
      ? z.infer<PARAMETERS>
      : never;
/**
 * This is a wrapper around the ai.tool function that adds support for
 * userId and chatId to the tool, if they're called within a chat from an agent.
 * @param tool The AI tool. See https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling
 * @returns The same tool, but with userId and chatId args support added.
 */
export function tool<PARAMETERS extends ToolParameters, RESULT>(
  tool: Tool<PARAMETERS, RESULT> & {
    execute: (
      args: inferParameters<PARAMETERS> & { userId?: string; chatId?: string },
      options: ToolExecutionOptions
    ) => PromiseLike<RESULT>;
  }
): Tool<PARAMETERS, RESULT> & {
  execute: (
    args: inferParameters<PARAMETERS>,
    options: ToolExecutionOptions
  ) => PromiseLike<RESULT>;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (tool as any).__acceptUserIdAndChatId = true;
  return tool;
}

// export function convexValidatorSchema<T>(validator: Validator<unknown>)  {
//   return ai.jsonSchema(convexToJsonSchema(validator));
// }
