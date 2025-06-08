import type { FileUIPart } from "@ai-sdk/ui-utils";
import {
  convertToCoreMessages,
  coreMessageSchema,
  type Message as AIMessage,
  type AssistantContent,
  type CoreMessage,
  type DataContent,
  type FilePart,
  type GenerateObjectResult,
  type ImagePart,
  type StepResult,
  type ToolContent,
  type ToolSet,
  type UserContent,
} from "ai";
import { assert } from "convex-helpers";
import type {
  MessageWithMetadata,
  Step,
  StepWithMessagesWithMetadata,
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
  const { id: _, experimental_providerMetadata, ...message } = messageWithId;
  const content = message.content;
  return {
    // for backwards compatibility
    providerOptions: experimental_providerMetadata,
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
  step: StepResult<TOOLS>,
  metadata: { model: string; provider: string }
): MessageWithMetadata[] {
  // If there are tool results, there's another message with the tool results
  // ref: https://github.com/vercel/ai/blob/main/packages/ai/core/generate-text/to-response-messages.ts
  const assistantFields = {
    model: metadata.model,
    provider: metadata.provider,
    providerMetadata: step.providerMetadata,
    reasoning: step.reasoning,
    reasoningDetails: step.reasoningDetails,
    usage: step.usage,
    warnings: step.warnings,
    finishReason: step.finishReason,
  };
  const toolFields = {
    sources: step.sources,
  };
  const messages: MessageWithMetadata[] = (
    step.toolResults.length > 0
      ? step.response.messages.slice(-2)
      : step.response.messages.slice(-1)
  ).map(
    (message): MessageWithMetadata => ({
      message: serializeMessage(message),
      // Let's not store the ID by default here. It's being generated internally
      // and not referenced elsewhere that we know of.
      // id: message.id,
      ...(message.role === "tool" ? toolFields : assistantFields),
      text: step.text,
      // fileId: message.fileId,
    })
  );
  return messages;
}

export function serializeObjectResult(
  result: GenerateObjectResult<unknown>,
  metadata: { model: string; provider: string }
): StepWithMessagesWithMetadata {
  const text = JSON.stringify(result.object);

  const message = {
    role: "assistant" as const,
    content: text,
    id: result.response.id,
  };
  return {
    messages: [
      {
        message,
        id: result.response.id,
        model: metadata.model,
        provider: metadata.provider,
        providerMetadata: result.providerMetadata,
        finishReason: result.finishReason,
        text,
        usage: result.usage,
        warnings: result.warnings,
      },
    ],
    step: {
      text,
      isContinued: false,
      stepType: "initial",
      toolCalls: [],
      toolResults: [],
      usage: result.usage,
      warnings: result.warnings,
      finishReason: result.finishReason,
      providerMetadata: result.providerMetadata,
      request: result.request,
      response: {
        ...result.response,
        timestamp: result.response.timestamp.getTime(),
        messages: [{ message, id: result.response.id }],
      },
    },
  };
}

export function serializeContent(content: Content): SerializedContent {
  if (typeof content === "string") {
    return content;
  }
  const serialized = content.map(
    ({ experimental_providerMetadata, ...rest }) => {
      const part = { providerOptions: experimental_providerMetadata, ...rest };
      switch (part.type) {
        case "image":
          return { ...part, image: serializeDataOrUrl(part.image) };
        case "file":
          return { ...part, data: serializeDataOrUrl(part.data) };
        default:
          return part;
      }
    }
  );
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
        return { ...part, data: deserializeUrl(part.data) };
      default:
        return part;
    }
  }) as Content;
}

/**
 * Return a best-guess MIME type based on the magic-number signature
 * found at the start of an ArrayBuffer.
 *
 * @param buf – the source ArrayBuffer
 * @returns the detected MIME type, or `"application/octet-stream"` if unknown
 */
function guessMimeType(buf: ArrayBuffer | string): string {
  if (typeof buf === "string") {
    if (buf.match(/^data:\w+\/\w+;base64/)) {
      return buf.split(";")[0].split(":")[1]!;
    }
    return "text/plain";
  }
  if (buf.byteLength < 4) return "application/octet-stream";

  // Read the first 12 bytes (enough for all signatures below)
  const bytes = new Uint8Array(buf.slice(0, 12));
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

  // Helper so we can look at only the needed prefix
  const startsWith = (sig: string) => hex.startsWith(sig.toLowerCase());

  // --- image formats ---
  if (startsWith("89504e47")) return "image/png"; // PNG  - 89 50 4E 47
  if (
    startsWith("ffd8ffdb") ||
    startsWith("ffd8ffe0") ||
    startsWith("ffd8ffee") ||
    startsWith("ffd8ffe1")
  )
    return "image/jpeg"; // JPEG
  if (startsWith("47494638")) return "image/gif"; // GIF
  if (startsWith("424d")) return "image/bmp"; // BMP
  if (startsWith("52494646") && hex.substr(16, 8) === "57454250")
    return "image/webp"; // WEBP (RIFF....WEBP)

  // --- audio/video ---
  if (startsWith("494433")) return "audio/mpeg"; // MP3 (ID3)
  if (startsWith("000001ba") || startsWith("000001b3")) return "video/mpeg"; // MPEG container
  if (startsWith("1a45dfa3")) return "video/webm"; // WEBM / Matroska
  if (startsWith("00000018") && hex.substr(16, 8) === "66747970")
    return "video/mp4"; // MP4
  if (startsWith("4f676753")) return "audio/ogg"; // OGG / Opus

  // --- documents & archives ---
  if (startsWith("25504446")) return "application/pdf"; // PDF
  if (
    startsWith("504b0304") ||
    startsWith("504b0506") ||
    startsWith("504b0708")
  )
    return "application/zip"; // ZIP / DOCX / PPTX / XLSX / EPUB
  if (startsWith("52617221")) return "application/x-rar-compressed"; // RAR
  if (startsWith("7f454c46")) return "application/x-elf"; // ELF binaries
  if (startsWith("1f8b08")) return "application/gzip"; // GZIP
  if (startsWith("425a68")) return "application/x-bzip2"; // BZIP2
  if (startsWith("3c3f786d6c")) return "application/xml"; // XML

  // Plain text, JSON and others are trickier—fallback:
  return "application/octet-stream";
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

export function toUIFilePart(part: ImagePart | FilePart): FileUIPart {
  const dataOrUrl = serializeDataOrUrl(
    part.type === "image" ? part.image : part.data
  );

  return {
    type: "file",
    data:
      dataOrUrl instanceof ArrayBuffer ? encodeBase64(dataOrUrl) : dataOrUrl,
    mimeType: part.mimeType ?? guessMimeType(dataOrUrl),
  };
}

function encodeBase64(data: ArrayBuffer): string {
  return Buffer.from(data).toString("base64");
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
