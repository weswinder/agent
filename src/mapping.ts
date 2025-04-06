import type {
  AssistantContent,
  CoreAssistantMessage,
  CoreMessage,
  CoreToolMessage,
  DataContent,
  GenerateTextResult,
  StepResult,
  ToolContent,
  ToolSet,
  UserContent,
} from "ai";
import { MessageWithFileAndId, Step } from "./validators";

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

export function serializeResponse<TOOLS extends ToolSet, OUTPUT>(
  response: GenerateTextResult<TOOLS, OUTPUT>["response"]
): { message: SerializedMessage; id?: string }[] {
  const { id, timestamp, modelId, headers, messages, body } = response;
  // TODO: what to do about all the rest?
  // Store body?
  return messages.map((m) => serializeMessageWithId(m));
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
    headers: {},
  };
  return {
    ...step,
    response,
  };
}

export function serializeNewMessagesInStep<TOOLS extends ToolSet>(
  step: StepResult<TOOLS>
): MessageWithFileAndId[] {
  const messages: MessageWithFileAndId[] = [];
  if (step.text) {
    messages.push(
      serializeMessageWithId({
        id: step.response.id,
        role: "assistant",
        content: step.text,
      })
    );
  }
  if (step.toolCalls) {
    messages.push(
      serializeMessageWithId({
        id: step.response.id,
        role: "assistant",
        content: step.toolCalls,
      })
    );
  }
  if (step.toolResults) {
    messages.push(
      serializeMessageWithId({
        id: step.response.id,
        role: "tool",
        content: step.toolResults,
      })
    );
  }
  return messages;
}

export function deserializeContent(content: SerializedContent): Content {
  if (typeof content === "string") {
    return content;
  }
  return content.map((part) => {
    switch (part.type) {
      case "image":
        return { ...part, file: deserializeUrl(part.image) };
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
