import { Infer, v } from "convex/values";
import { vVectorDimension } from "./component/vector/tables";

// const deprecated = v.optional(v.any()) as unknown as VNull<unknown, "optional">;

const providerOptions = v.optional(v.record(v.string(), v.any()));
const experimental_providerMetadata = providerOptions;

export const vThreadStatus = v.union(
  v.literal("active"),
  v.literal("archived")
);
export const vMessageStatus = v.union(
  v.literal("pending"),
  v.literal("success"),
  v.literal("failed")
);
export type MessageStatus = Infer<typeof vMessageStatus>;

export const vRole = v.union(
  v.literal("system"),
  v.literal("user"),
  v.literal("assistant"),
  v.literal("tool")
);

export const vTextPart = v.object({
  type: v.literal("text"),
  text: v.string(),
  providerOptions,
  experimental_providerMetadata,
});

export const vImagePart = v.object({
  type: v.literal("image"),
  image: v.union(v.string(), v.bytes()),
  mimeType: v.optional(v.string()),
  providerOptions,
  experimental_providerMetadata,
});

export const vFilePart = v.object({
  type: v.literal("file"),
  data: v.union(v.string(), v.bytes()),
  mimeType: v.string(),
  providerOptions,
  experimental_providerMetadata,
});

export const vUserContent = v.union(
  v.string(),
  v.array(v.union(vTextPart, vImagePart, vFilePart))
);

export const vReasoningPart = v.object({
  type: v.literal("reasoning"),
  text: v.string(),
  providerOptions,
  experimental_providerMetadata,
});

export const vRedactedReasoningPart = v.object({
  type: v.literal("redacted-reasoning"),
  data: v.string(),
  providerOptions,
  experimental_providerMetadata,
});

export const vToolCallPart = v.object({
  type: v.literal("tool-call"),
  toolCallId: v.string(),
  toolName: v.string(),
  args: v.any(),
  providerOptions,
  experimental_providerMetadata,
});

export const vAssistantContent = v.union(
  v.string(),
  v.array(
    v.union(
      vTextPart,
      vFilePart,
      vReasoningPart,
      vRedactedReasoningPart,
      vToolCallPart
    )
  )
);

const vToolResultContent = v.array(
  v.union(
    v.object({
      type: v.literal("text"),
      text: v.string(),
    }),
    v.object({
      type: v.literal("image"),
      data: v.string(),
      mimeType: v.optional(v.string()),
    })
  )
);

const vToolResultPart = v.object({
  type: v.literal("tool-result"),
  toolCallId: v.string(),
  toolName: v.string(),
  result: v.any(),
  args: v.optional(v.any()),
  experimental_content: v.optional(vToolResultContent),
  isError: v.optional(v.boolean()),
  providerOptions,
  experimental_providerMetadata,
});
export const vToolContent = v.array(vToolResultPart);

export const vContent = v.union(vUserContent, vAssistantContent, vToolContent);
export type Content = Infer<typeof vContent>;

export const vUserMessage = v.object({
  role: v.literal("user"),
  content: vUserContent,
  providerOptions,
  experimental_providerMetadata,
});

export const vAssistantMessage = v.object({
  role: v.literal("assistant"),
  content: vAssistantContent,
  providerOptions,
  experimental_providerMetadata,
});

export const vToolMessage = v.object({
  role: v.literal("tool"),
  content: vToolContent,
  providerOptions,
  experimental_providerMetadata,
});

export const vSystemMessage = v.object({
  role: v.literal("system"),
  content: v.string(),
  providerOptions,
  experimental_providerMetadata,
});

export const vMessage = v.union(
  vUserMessage,
  vAssistantMessage,
  vToolMessage,
  vSystemMessage
);
export type Message = Infer<typeof vMessage>;

export const vMessageWithFileAndId = v.object({
  id: v.optional(v.string()),
  message: vMessage,
  fileId: v.optional(v.id("files")),
});
export type MessageWithFileAndId = Infer<typeof vMessageWithFileAndId>;

export const vSource = v.object({
  sourceType: v.literal("url"),
  id: v.string(),
  url: v.string(),
  title: v.optional(v.string()),
  providerMetadata: providerOptions,
});

export const vRequest = v.object({
  body: v.optional(v.any()),
  // These are not usually present
  headers: v.optional(v.record(v.string(), v.string())),
  method: v.optional(v.string()),
  url: v.optional(v.string()),
});

export const vResponse = v.object({
  id: v.string(),
  timestamp: v.number(),
  modelId: v.string(),
  headers: v.optional(v.record(v.string(), v.string())), // clear these?
  messages: v.array(vMessageWithFileAndId),
  body: v.optional(v.any()),
});

export const vFinishReason = v.union(
  v.literal("stop"),
  v.literal("length"),
  v.literal("content-filter"),
  v.literal("tool-calls"),
  v.literal("error"),
  v.literal("other"),
  v.literal("unknown")
);

export const vLanguageModelV1CallWarning = v.union(
  v.object({
    type: v.literal("unsupported-setting"),
    setting: v.string(),
    details: v.optional(v.string()),
  }),
  v.object({
    type: v.literal("unsupported-tool"),
    tool: v.any(),
    details: v.optional(v.string()),
  }),
  v.object({
    type: v.literal("other"),
    message: v.string(),
  })
);
export const vStep = v.object({
  experimental_providerMetadata,
  files: v.optional(v.array(v.any())),
  finishReason: vFinishReason,
  isContinued: v.boolean(),
  logprobs: v.optional(v.any()),
  providerMetadata: providerOptions,
  providerOptions,
  reasoning: v.optional(v.string()),
  reasoningDetails: v.optional(v.array(v.any())),
  request: v.optional(vRequest),
  response: v.optional(vResponse),
  sources: v.optional(v.array(vSource)),
  stepType: v.union(
    v.literal("initial"),
    v.literal("continue"),
    v.literal("tool-result")
  ),
  text: v.string(),
  toolCalls: v.array(vToolCallPart),
  toolResults: v.array(vToolResultPart),
  usage: v.optional(
    v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
    })
  ),
  warnings: v.optional(v.array(vLanguageModelV1CallWarning)),
});
export type Step = Infer<typeof vStep>;

export const vStepWithMessages = v.object({
  step: vStep,
  messages: v.array(vMessageWithFileAndId),
});
export type StepWithMessagesWithFileAndId = Infer<typeof vStepWithMessages>;

export const vSearchOptions = v.object({
  vector: v.optional(v.array(v.number())),
  vectorModel: v.optional(v.string()),
  text: v.optional(v.string()),
  limit: v.number(),
  messageRange: v.optional(v.object({ before: v.number(), after: v.number() })),
});
export type SearchOptions = Infer<typeof vSearchOptions>;

export const vContextOptionsSearchOptions = v.object({
  limit: v.number(),
  textSearch: v.optional(v.boolean()),
  vectorSearch: v.optional(v.boolean()),
  messageRange: v.optional(v.object({ before: v.number(), after: v.number() })),
});

export const vContextOptions = v.object({
  includeToolCalls: v.optional(v.boolean()),
  recentMessages: v.optional(v.number()),
  searchOptions: v.optional(vContextOptionsSearchOptions),
  searchOtherThreads: v.optional(v.boolean()),
});

export const vStorageOptions = v.object({
  saveAllInputMessages: v.optional(v.boolean()),
  saveAllOutputMessages: v.optional(v.boolean()),
});

export const vThreadArgs = v.object({
  maxSteps: v.optional(v.number()),
  prompt: v.optional(v.string()),
  messages: v.optional(v.array(vMessage)),
});

export const vObjectArgs = v.object({
  output: v.optional(v.any()),
  mode: v.optional(v.literal("json")),
  prompt: v.optional(v.string()),
  messages: v.optional(v.array(vMessage)),
});

export const vEmbeddingsWithMetadata = v.object({
  vectors: v.array(v.union(v.array(v.number()), v.null())),
  dimension: vVectorDimension,
  model: v.string(),
});
export type EmbeddingsWithMetadata = Infer<typeof vEmbeddingsWithMetadata>;
