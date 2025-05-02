import {
  convertToCoreMessages,
  coreMessageSchema,
  GenerateObjectResult,
  type AssistantContent,
  type CoreMessage,
  type DataContent,
  type StepResult,
  type ToolContent,
  type ToolSet,
  type Message as AIMessage,
  type UserContent,
} from "ai";
import { assert } from "convex-helpers";
import {
  MessageWithFileAndId,
  Step,
  StepWithMessagesWithFileAndId,
} from "./validators";

export type AIMessageWithoutId = Omit<AIMessage, "id">;

export type SerializeUrlsAndUint8Arrays<T> = T extends URL
  ? string
  : T extends Uint8Array | ArrayBufferLike
    ? ArrayBuffer
    : T extends Array<infer Inner>
      ? Array<SerializeUrlsAndUint8Arrays<Inner>>
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        T extends Record<string, any>
        ? { [K in keyof T]: SerializeUrlsAndUint8Arrays<T[K]> }
        : T;

export type Content = UserContent | AssistantContent | ToolContent;
export type SerializedContent = SerializeUrlsAndUint8Arrays<Content>;

export type SerializedMessage = SerializeUrlsAndUint8Arrays<CoreMessage>;

export function serializeMessage(
  messageWithId: CoreMessage & { id?: string }
): SerializedMessage {
  const { id: _, ...message } = messageWithId;
  const content = message.content;
  return {
    ...message,
    content: serializeContent(content),
  } as SerializedMessage;
}

export function serializeMessageWithId(
  messageWithId: CoreMessage & { id?: string }
): { message: SerializedMessage; id: string | undefined } {
  return { message: serializeMessage(messageWithId), id: messageWithId.id };
}

export function deserializeMessage(message: SerializedMessage): CoreMessage {
  return {
    ...message,
    content: deserializeContent(message.content),
  } as CoreMessage;
}

export function serializeStep<TOOLS extends ToolSet>(
  step: StepResult<TOOLS>
): Step {
  const content = step.response?.messages.map((message) => {
    return serializeMessageWithId(message);
  });
  const timestamp = step.response?.timestamp.getTime();
  const response = {
    ...step.response,
    messages: content,
    timestamp,
    headers: {}, // these are large and low value
  };
  return {
    ...step,
    response,
  };
}

export function serializeNewMessagesInStep<TOOLS extends ToolSet>(
  step: StepResult<TOOLS>
): MessageWithFileAndId[] {
  // If there are tool results, there's another message with the tool results
  // ref: https://github.com/vercel/ai/blob/main/packages/ai/core/generate-text/to-response-messages.ts
  const messages: MessageWithFileAndId[] = (
    step.toolResults.length > 0
      ? step.response.messages.slice(0, -2)
      : step.response.messages.slice(0, -1)
  ).map(serializeMessageWithId);
  return messages;
}

export function serializeObjectResult(
  result: GenerateObjectResult<unknown>
): StepWithMessagesWithFileAndId {
  const text = JSON.stringify(result.object);
  const serializedMessage = serializeMessageWithId({
    role: "assistant" as const,
    content: text,
    id: result.response.id,
  });

  const messages = [serializedMessage];

  return {
    messages,
    step: {
      text,
      isContinued: false,
      stepType: "initial",
      toolCalls: [],
      toolResults: [],
      usage: result.usage,
      warnings: result.warnings,
      finishReason: result.finishReason,
      request: result.request,
      response: {
        ...result.response,
        timestamp: result.response.timestamp.getTime(),
        messages,
      },
      providerMetadata: result.providerMetadata,
      experimental_providerMetadata: result.experimental_providerMetadata,
    },
  };
}

export function serializeContent(content: Content): SerializedContent {
  if (typeof content === "string") {
    return content;
  }
  const serialized = content.map((part) => {
    switch (part.type) {
      case "image":
        return { ...part, image: serializeDataOrUrl(part.image) };
      case "file":
        return { ...part, file: serializeDataOrUrl(part.data) };
      default:
        return part;
    }
  });
  return serialized as SerializedContent;
}

export function deserializeContent(content: SerializedContent): Content {
  if (typeof content === "string") {
    return content;
  }
  return content.map((part) => {
    switch (part.type) {
      case "image":
        return { ...part, image: deserializeUrl(part.image) };
      case "file":
        return { ...part, file: deserializeUrl(part.data) };
      default:
        return part;
    }
  }) as Content;
}

// TODO: store in file storage if it's big
function serializeDataOrUrl(
  dataOrUrl: DataContent | URL
): ArrayBuffer | string {
  if (typeof dataOrUrl === "string") {
    return dataOrUrl;
  }
  if (dataOrUrl instanceof ArrayBuffer) {
    return dataOrUrl; // Already an ArrayBuffer
  }
  if (dataOrUrl instanceof URL) {
    return dataOrUrl.toString();
  }
  return dataOrUrl.buffer.slice(
    dataOrUrl.byteOffset,
    dataOrUrl.byteOffset + dataOrUrl.byteLength
  ) as ArrayBuffer;
}

function deserializeUrl(urlOrString: string | ArrayBuffer): URL | DataContent {
  if (typeof urlOrString === "string") {
    if (
      urlOrString.startsWith("http://") ||
      urlOrString.startsWith("https://")
    ) {
      return new URL(urlOrString);
    }
    return urlOrString;
  }
  return urlOrString;
}

export function promptOrMessagesToCoreMessages(args: {
  prompt?: string;
  messages?: CoreMessage[] | AIMessageWithoutId[];
}): CoreMessage[] {
  const messages: CoreMessage[] = [];
  assert(args.prompt || args.messages, "messages or prompt is required");
  if (args.messages) {
    if (
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
      messages.push(...convertToCoreMessages(args.messages as AIMessage[]));
    } else {
      messages.push(...coreMessageSchema.array().parse(args.messages));
    }
  }
  if (args.prompt) {
    messages.push({ role: "user", content: args.prompt });
  }
  assert(messages.length > 0, "Messages must contain at least one message");
  return messages;
}
