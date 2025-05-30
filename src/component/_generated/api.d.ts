/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apiKeys from "../apiKeys.js";
import type * as files from "../files.js";
import type * as messages from "../messages.js";
import type * as streams from "../streams.js";
import type * as threads from "../threads.js";
import type * as users from "../users.js";
import type * as vector_index from "../vector/index.js";
import type * as vector_tables from "../vector/tables.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  apiKeys: typeof apiKeys;
  files: typeof files;
  messages: typeof messages;
  streams: typeof streams;
  threads: typeof threads;
  users: typeof users;
  "vector/index": typeof vector_index;
  "vector/tables": typeof vector_tables;
}>;
export type Mounts = {
  apiKeys: {
    destroy: FunctionReference<
      "mutation",
      "public",
      { apiKey?: string; name?: string },
      | "missing"
      | "deleted"
      | "name mismatch"
      | "must provide either apiKey or name"
    >;
    issue: FunctionReference<"mutation", "public", { name?: string }, string>;
    validate: FunctionReference<"query", "public", { apiKey: string }, boolean>;
  };
  files: {
    addFile: FunctionReference<
      "mutation",
      "public",
      { hash: string; storageId: string },
      { fileId: string; storageIdUnused: boolean }
    >;
    copyFile: FunctionReference<"mutation", "public", { fileId: string }, null>;
    getFilesToDelete: FunctionReference<
      "query",
      "public",
      { cursor?: string; limit?: number },
      {
        continueCursor: string;
        files: Array<{
          _creationTime: number;
          _id: string;
          hash: string;
          refcount: number;
          storageId: string;
        }>;
        isDone: boolean;
      }
    >;
    useExistingFile: FunctionReference<
      "mutation",
      "public",
      { hash: string },
      string | null
    >;
  };
  messages: {
    addMessages: FunctionReference<
      "mutation",
      "public",
      {
        agentName?: string;
        embeddings?: {
          dimension:
            | 128
            | 256
            | 512
            | 768
            | 1024
            | 1408
            | 1536
            | 2048
            | 3072
            | 4096;
          model: string;
          vectors: Array<Array<number> | null>;
        };
        failPendingSteps?: boolean;
        messages: Array<{
          error?: string;
          files?: Array<{
            data?: ArrayBuffer | string;
            fileId?: string;
            mimeType: string;
            url?: string;
          }>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          mimeType: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          mimeType: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  isError?: boolean;
                  providerOptions?: Record<string, Record<string, any>>;
                  result: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<{
            id: string;
            providerOptions?: Record<string, Record<string, any>>;
            sourceType: "url";
            title?: string;
            url: string;
          }>;
          text?: string;
          usage?: {
            completionTokens: number;
            promptTokens: number;
            totalTokens: number;
          };
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }>;
        pending?: boolean;
        promptMessageId?: string;
        stepId?: string;
        threadId: string;
        userId?: string;
      },
      {
        messages: Array<{
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          files?: Array<{
            data?: ArrayBuffer | string;
            fileId?: string;
            mimeType: string;
            url?: string;
          }>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          mimeType: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          mimeType: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  isError?: boolean;
                  providerOptions?: Record<string, Record<string, any>>;
                  result: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<{
            id: string;
            providerOptions?: Record<string, Record<string, any>>;
            sourceType: "url";
            title?: string;
            url: string;
          }>;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            completionTokens: number;
            promptTokens: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }>;
        pending?: {
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          files?: Array<{
            data?: ArrayBuffer | string;
            fileId?: string;
            mimeType: string;
            url?: string;
          }>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          mimeType: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          mimeType: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  isError?: boolean;
                  providerOptions?: Record<string, Record<string, any>>;
                  result: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<{
            id: string;
            providerOptions?: Record<string, Record<string, any>>;
            sourceType: "url";
            title?: string;
            url: string;
          }>;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            completionTokens: number;
            promptTokens: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        };
      }
    >;
    addStep: FunctionReference<
      "mutation",
      "public",
      {
        failPendingSteps?: boolean;
        promptMessageId: string;
        step: {
          embeddings?: {
            dimension:
              | 128
              | 256
              | 512
              | 768
              | 1024
              | 1408
              | 1536
              | 2048
              | 3072
              | 4096;
            model: string;
            vectors: Array<Array<number> | null>;
          };
          messages: Array<{
            error?: string;
            files?: Array<{
              data?: ArrayBuffer | string;
              fileId?: string;
              mimeType: string;
              url?: string;
            }>;
            finishReason?:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            id?: string;
            message:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            mimeType: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            mimeType: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            signature?: string;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args: any;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "assistant";
                }
              | {
                  content: Array<{
                    args?: any;
                    experimental_content?: Array<
                      | { text: string; type: "text" }
                      | { data: string; mimeType?: string; type: "image" }
                    >;
                    isError?: boolean;
                    providerOptions?: Record<string, Record<string, any>>;
                    result: any;
                    toolCallId: string;
                    toolName: string;
                    type: "tool-result";
                  }>;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "tool";
                }
              | {
                  content: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "system";
                };
            model?: string;
            provider?: string;
            providerMetadata?: Record<string, Record<string, any>>;
            reasoning?: string;
            reasoningDetails?: Array<
              | { signature?: string; text: string; type: "text" }
              | { data: string; type: "redacted" }
            >;
            sources?: Array<{
              id: string;
              providerOptions?: Record<string, Record<string, any>>;
              sourceType: "url";
              title?: string;
              url: string;
            }>;
            text?: string;
            usage?: {
              completionTokens: number;
              promptTokens: number;
              totalTokens: number;
            };
            warnings?: Array<
              | {
                  details?: string;
                  setting: string;
                  type: "unsupported-setting";
                }
              | { details?: string; tool: any; type: "unsupported-tool" }
              | { message: string; type: "other" }
            >;
          }>;
          step: {
            experimental_providerMetadata?: Record<string, Record<string, any>>;
            files?: Array<any>;
            finishReason:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            isContinued: boolean;
            logprobs?: any;
            providerMetadata?: Record<string, Record<string, any>>;
            reasoning?: string;
            reasoningDetails?: Array<
              | { signature?: string; text: string; type: "text" }
              | { data: string; type: "redacted" }
            >;
            request?: {
              body?: any;
              headers?: Record<string, string>;
              method?: string;
              url?: string;
            };
            response?: {
              body?: any;
              headers?: Record<string, string>;
              id: string;
              messages: Array<{
                fileId?: string;
                id?: string;
                message:
                  | {
                      content:
                        | string
                        | Array<
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                text: string;
                                type: "text";
                              }
                            | {
                                image: string | ArrayBuffer;
                                mimeType?: string;
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "image";
                              }
                            | {
                                data: string | ArrayBuffer;
                                mimeType: string;
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "file";
                              }
                          >;
                      providerOptions?: Record<string, Record<string, any>>;
                      role: "user";
                    }
                  | {
                      content:
                        | string
                        | Array<
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                text: string;
                                type: "text";
                              }
                            | {
                                data: string | ArrayBuffer;
                                mimeType: string;
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "file";
                              }
                            | {
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                signature?: string;
                                text: string;
                                type: "reasoning";
                              }
                            | {
                                data: string;
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                type: "redacted-reasoning";
                              }
                            | {
                                args: any;
                                providerOptions?: Record<
                                  string,
                                  Record<string, any>
                                >;
                                toolCallId: string;
                                toolName: string;
                                type: "tool-call";
                              }
                          >;
                      providerOptions?: Record<string, Record<string, any>>;
                      role: "assistant";
                    }
                  | {
                      content: Array<{
                        args?: any;
                        experimental_content?: Array<
                          | { text: string; type: "text" }
                          | { data: string; mimeType?: string; type: "image" }
                        >;
                        isError?: boolean;
                        providerOptions?: Record<string, Record<string, any>>;
                        result: any;
                        toolCallId: string;
                        toolName: string;
                        type: "tool-result";
                      }>;
                      providerOptions?: Record<string, Record<string, any>>;
                      role: "tool";
                    }
                  | {
                      content: string;
                      providerOptions?: Record<string, Record<string, any>>;
                      role: "system";
                    };
              }>;
              modelId: string;
              timestamp: number;
            };
            sources?: Array<{
              id: string;
              providerOptions?: Record<string, Record<string, any>>;
              sourceType: "url";
              title?: string;
              url: string;
            }>;
            stepType: "initial" | "continue" | "tool-result";
            text: string;
            toolCalls: Array<{
              args: any;
              providerOptions?: Record<string, Record<string, any>>;
              toolCallId: string;
              toolName: string;
              type: "tool-call";
            }>;
            toolResults: Array<{
              args?: any;
              experimental_content?: Array<
                | { text: string; type: "text" }
                | { data: string; mimeType?: string; type: "image" }
              >;
              isError?: boolean;
              providerOptions?: Record<string, Record<string, any>>;
              result: any;
              toolCallId: string;
              toolName: string;
              type: "tool-result";
            }>;
            usage?: {
              completionTokens: number;
              promptTokens: number;
              totalTokens: number;
            };
            warnings?: Array<
              | {
                  details?: string;
                  setting: string;
                  type: "unsupported-setting";
                }
              | { details?: string; tool: any; type: "unsupported-tool" }
              | { message: string; type: "other" }
            >;
          };
        };
        threadId: string;
        userId?: string;
      },
      Array<{
        _creationTime: number;
        _id: string;
        agentName?: string;
        embeddingId?: string;
        error?: string;
        files?: Array<{
          data?: ArrayBuffer | string;
          fileId?: string;
          mimeType: string;
          url?: string;
        }>;
        finishReason?:
          | "stop"
          | "length"
          | "content-filter"
          | "tool-calls"
          | "error"
          | "other"
          | "unknown";
        id?: string;
        message?:
          | {
              content:
                | string
                | Array<
                    | {
                        providerOptions?: Record<string, Record<string, any>>;
                        text: string;
                        type: "text";
                      }
                    | {
                        image: string | ArrayBuffer;
                        mimeType?: string;
                        providerOptions?: Record<string, Record<string, any>>;
                        type: "image";
                      }
                    | {
                        data: string | ArrayBuffer;
                        mimeType: string;
                        providerOptions?: Record<string, Record<string, any>>;
                        type: "file";
                      }
                  >;
              providerOptions?: Record<string, Record<string, any>>;
              role: "user";
            }
          | {
              content:
                | string
                | Array<
                    | {
                        providerOptions?: Record<string, Record<string, any>>;
                        text: string;
                        type: "text";
                      }
                    | {
                        data: string | ArrayBuffer;
                        mimeType: string;
                        providerOptions?: Record<string, Record<string, any>>;
                        type: "file";
                      }
                    | {
                        providerOptions?: Record<string, Record<string, any>>;
                        signature?: string;
                        text: string;
                        type: "reasoning";
                      }
                    | {
                        data: string;
                        providerOptions?: Record<string, Record<string, any>>;
                        type: "redacted-reasoning";
                      }
                    | {
                        args: any;
                        providerOptions?: Record<string, Record<string, any>>;
                        toolCallId: string;
                        toolName: string;
                        type: "tool-call";
                      }
                  >;
              providerOptions?: Record<string, Record<string, any>>;
              role: "assistant";
            }
          | {
              content: Array<{
                args?: any;
                experimental_content?: Array<
                  | { text: string; type: "text" }
                  | { data: string; mimeType?: string; type: "image" }
                >;
                isError?: boolean;
                providerOptions?: Record<string, Record<string, any>>;
                result: any;
                toolCallId: string;
                toolName: string;
                type: "tool-result";
              }>;
              providerOptions?: Record<string, Record<string, any>>;
              role: "tool";
            }
          | {
              content: string;
              providerOptions?: Record<string, Record<string, any>>;
              role: "system";
            };
        model?: string;
        order: number;
        provider?: string;
        providerMetadata?: Record<string, Record<string, any>>;
        providerOptions?: Record<string, Record<string, any>>;
        reasoning?: string;
        reasoningDetails?: Array<
          | { signature?: string; text: string; type: "text" }
          | { data: string; type: "redacted" }
        >;
        sources?: Array<{
          id: string;
          providerOptions?: Record<string, Record<string, any>>;
          sourceType: "url";
          title?: string;
          url: string;
        }>;
        status: "pending" | "success" | "failed";
        stepOrder: number;
        text?: string;
        threadId: string;
        tool: boolean;
        usage?: {
          completionTokens: number;
          promptTokens: number;
          totalTokens: number;
        };
        userId?: string;
        warnings?: Array<
          | { details?: string; setting: string; type: "unsupported-setting" }
          | { details?: string; tool: any; type: "unsupported-tool" }
          | { message: string; type: "other" }
        >;
      }>
    >;
    commitMessage: FunctionReference<
      "mutation",
      "public",
      { messageId: string },
      null
    >;
    getThreadMessages: FunctionReference<
      "query",
      "public",
      { deprecated: "Use listMessagesByThreadId instead" },
      {
        continueCursor: string;
        isDone: boolean;
        page: Array<{
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          files?: Array<{
            data?: ArrayBuffer | string;
            fileId?: string;
            mimeType: string;
            url?: string;
          }>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          mimeType: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          mimeType: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  isError?: boolean;
                  providerOptions?: Record<string, Record<string, any>>;
                  result: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<{
            id: string;
            providerOptions?: Record<string, Record<string, any>>;
            sourceType: "url";
            title?: string;
            url: string;
          }>;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            completionTokens: number;
            promptTokens: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }>;
        pageStatus?: "SplitRecommended" | "SplitRequired" | null;
        splitCursor?: string | null;
      }
    >;
    listMessagesByThreadId: FunctionReference<
      "query",
      "public",
      {
        excludeToolMessages?: boolean;
        isTool?: "use excludeToolMessages instead of this";
        order: "asc" | "desc";
        paginationOpts?: {
          cursor: string | null;
          endCursor?: string | null;
          id?: number;
          maximumBytesRead?: number;
          maximumRowsRead?: number;
          numItems: number;
        };
        statuses?: Array<"pending" | "success" | "failed">;
        threadId: string;
        upToAndIncludingMessageId?: string;
      },
      {
        continueCursor: string;
        isDone: boolean;
        page: Array<{
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          files?: Array<{
            data?: ArrayBuffer | string;
            fileId?: string;
            mimeType: string;
            url?: string;
          }>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          mimeType: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          mimeType: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  isError?: boolean;
                  providerOptions?: Record<string, Record<string, any>>;
                  result: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<{
            id: string;
            providerOptions?: Record<string, Record<string, any>>;
            sourceType: "url";
            title?: string;
            url: string;
          }>;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            completionTokens: number;
            promptTokens: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }>;
        pageStatus?: "SplitRecommended" | "SplitRequired" | null;
        splitCursor?: string | null;
      }
    >;
    rollbackMessage: FunctionReference<
      "mutation",
      "public",
      { error?: string; messageId: string },
      null
    >;
    searchMessages: FunctionReference<
      "action",
      "public",
      {
        beforeMessageId?: string;
        limit: number;
        messageRange?: { after: number; before: number };
        text?: string;
        threadId?: string;
        userId?: string;
        vector?: Array<number>;
        vectorModel?: string;
        vectorScoreThreshold?: number;
      },
      Array<{
        _creationTime: number;
        _id: string;
        agentName?: string;
        embeddingId?: string;
        error?: string;
        files?: Array<{
          data?: ArrayBuffer | string;
          fileId?: string;
          mimeType: string;
          url?: string;
        }>;
        finishReason?:
          | "stop"
          | "length"
          | "content-filter"
          | "tool-calls"
          | "error"
          | "other"
          | "unknown";
        id?: string;
        message?:
          | {
              content:
                | string
                | Array<
                    | {
                        providerOptions?: Record<string, Record<string, any>>;
                        text: string;
                        type: "text";
                      }
                    | {
                        image: string | ArrayBuffer;
                        mimeType?: string;
                        providerOptions?: Record<string, Record<string, any>>;
                        type: "image";
                      }
                    | {
                        data: string | ArrayBuffer;
                        mimeType: string;
                        providerOptions?: Record<string, Record<string, any>>;
                        type: "file";
                      }
                  >;
              providerOptions?: Record<string, Record<string, any>>;
              role: "user";
            }
          | {
              content:
                | string
                | Array<
                    | {
                        providerOptions?: Record<string, Record<string, any>>;
                        text: string;
                        type: "text";
                      }
                    | {
                        data: string | ArrayBuffer;
                        mimeType: string;
                        providerOptions?: Record<string, Record<string, any>>;
                        type: "file";
                      }
                    | {
                        providerOptions?: Record<string, Record<string, any>>;
                        signature?: string;
                        text: string;
                        type: "reasoning";
                      }
                    | {
                        data: string;
                        providerOptions?: Record<string, Record<string, any>>;
                        type: "redacted-reasoning";
                      }
                    | {
                        args: any;
                        providerOptions?: Record<string, Record<string, any>>;
                        toolCallId: string;
                        toolName: string;
                        type: "tool-call";
                      }
                  >;
              providerOptions?: Record<string, Record<string, any>>;
              role: "assistant";
            }
          | {
              content: Array<{
                args?: any;
                experimental_content?: Array<
                  | { text: string; type: "text" }
                  | { data: string; mimeType?: string; type: "image" }
                >;
                isError?: boolean;
                providerOptions?: Record<string, Record<string, any>>;
                result: any;
                toolCallId: string;
                toolName: string;
                type: "tool-result";
              }>;
              providerOptions?: Record<string, Record<string, any>>;
              role: "tool";
            }
          | {
              content: string;
              providerOptions?: Record<string, Record<string, any>>;
              role: "system";
            };
        model?: string;
        order: number;
        provider?: string;
        providerMetadata?: Record<string, Record<string, any>>;
        providerOptions?: Record<string, Record<string, any>>;
        reasoning?: string;
        reasoningDetails?: Array<
          | { signature?: string; text: string; type: "text" }
          | { data: string; type: "redacted" }
        >;
        sources?: Array<{
          id: string;
          providerOptions?: Record<string, Record<string, any>>;
          sourceType: "url";
          title?: string;
          url: string;
        }>;
        status: "pending" | "success" | "failed";
        stepOrder: number;
        text?: string;
        threadId: string;
        tool: boolean;
        usage?: {
          completionTokens: number;
          promptTokens: number;
          totalTokens: number;
        };
        userId?: string;
        warnings?: Array<
          | { details?: string; setting: string; type: "unsupported-setting" }
          | { details?: string; tool: any; type: "unsupported-tool" }
          | { message: string; type: "other" }
        >;
      }>
    >;
    textSearch: FunctionReference<
      "query",
      "public",
      {
        beforeMessageId?: string;
        limit: number;
        text: string;
        threadId?: string;
        userId?: string;
      },
      Array<{
        _creationTime: number;
        _id: string;
        agentName?: string;
        embeddingId?: string;
        error?: string;
        files?: Array<{
          data?: ArrayBuffer | string;
          fileId?: string;
          mimeType: string;
          url?: string;
        }>;
        finishReason?:
          | "stop"
          | "length"
          | "content-filter"
          | "tool-calls"
          | "error"
          | "other"
          | "unknown";
        id?: string;
        message?:
          | {
              content:
                | string
                | Array<
                    | {
                        providerOptions?: Record<string, Record<string, any>>;
                        text: string;
                        type: "text";
                      }
                    | {
                        image: string | ArrayBuffer;
                        mimeType?: string;
                        providerOptions?: Record<string, Record<string, any>>;
                        type: "image";
                      }
                    | {
                        data: string | ArrayBuffer;
                        mimeType: string;
                        providerOptions?: Record<string, Record<string, any>>;
                        type: "file";
                      }
                  >;
              providerOptions?: Record<string, Record<string, any>>;
              role: "user";
            }
          | {
              content:
                | string
                | Array<
                    | {
                        providerOptions?: Record<string, Record<string, any>>;
                        text: string;
                        type: "text";
                      }
                    | {
                        data: string | ArrayBuffer;
                        mimeType: string;
                        providerOptions?: Record<string, Record<string, any>>;
                        type: "file";
                      }
                    | {
                        providerOptions?: Record<string, Record<string, any>>;
                        signature?: string;
                        text: string;
                        type: "reasoning";
                      }
                    | {
                        data: string;
                        providerOptions?: Record<string, Record<string, any>>;
                        type: "redacted-reasoning";
                      }
                    | {
                        args: any;
                        providerOptions?: Record<string, Record<string, any>>;
                        toolCallId: string;
                        toolName: string;
                        type: "tool-call";
                      }
                  >;
              providerOptions?: Record<string, Record<string, any>>;
              role: "assistant";
            }
          | {
              content: Array<{
                args?: any;
                experimental_content?: Array<
                  | { text: string; type: "text" }
                  | { data: string; mimeType?: string; type: "image" }
                >;
                isError?: boolean;
                providerOptions?: Record<string, Record<string, any>>;
                result: any;
                toolCallId: string;
                toolName: string;
                type: "tool-result";
              }>;
              providerOptions?: Record<string, Record<string, any>>;
              role: "tool";
            }
          | {
              content: string;
              providerOptions?: Record<string, Record<string, any>>;
              role: "system";
            };
        model?: string;
        order: number;
        provider?: string;
        providerMetadata?: Record<string, Record<string, any>>;
        providerOptions?: Record<string, Record<string, any>>;
        reasoning?: string;
        reasoningDetails?: Array<
          | { signature?: string; text: string; type: "text" }
          | { data: string; type: "redacted" }
        >;
        sources?: Array<{
          id: string;
          providerOptions?: Record<string, Record<string, any>>;
          sourceType: "url";
          title?: string;
          url: string;
        }>;
        status: "pending" | "success" | "failed";
        stepOrder: number;
        text?: string;
        threadId: string;
        tool: boolean;
        usage?: {
          completionTokens: number;
          promptTokens: number;
          totalTokens: number;
        };
        userId?: string;
        warnings?: Array<
          | { details?: string; setting: string; type: "unsupported-setting" }
          | { details?: string; tool: any; type: "unsupported-tool" }
          | { message: string; type: "other" }
        >;
      }>
    >;
  };
  streams: {
    addDelta: FunctionReference<
      "mutation",
      "public",
      {
        end: number;
        parts: Array<
          | { textDelta: string; type: "text-delta" }
          | { textDelta: string; type: "reasoning" }
          | {
              source: {
                id: string;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                url: string;
              };
              type: "source";
            }
          | {
              args: any;
              providerOptions?: Record<string, Record<string, any>>;
              toolCallId: string;
              toolName: string;
              type: "tool-call";
            }
          | {
              toolCallId: string;
              toolName: string;
              type: "tool-call-streaming-start";
            }
          | {
              argsTextDelta: string;
              toolCallId: string;
              toolName: string;
              type: "tool-call-delta";
            }
          | {
              args?: any;
              experimental_content?: Array<
                | { text: string; type: "text" }
                | { data: string; mimeType?: string; type: "image" }
              >;
              isError?: boolean;
              providerOptions?: Record<string, Record<string, any>>;
              result: any;
              toolCallId: string;
              toolName: string;
              type: "tool-result";
            }
        >;
        start: number;
        streamId: string;
      },
      null
    >;
    create: FunctionReference<
      "mutation",
      "public",
      {
        agentName?: string;
        model?: string;
        order: number;
        provider?: string;
        providerOptions?: Record<string, Record<string, any>>;
        stepOrder: number;
        threadId: string;
        userId?: string;
      },
      string
    >;
    finish: FunctionReference<
      "mutation",
      "public",
      {
        finalDelta?: {
          end: number;
          parts: Array<
            | { textDelta: string; type: "text-delta" }
            | { textDelta: string; type: "reasoning" }
            | {
                source: {
                  id: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "url";
                  title?: string;
                  url: string;
                };
                type: "source";
              }
            | {
                args: any;
                providerOptions?: Record<string, Record<string, any>>;
                toolCallId: string;
                toolName: string;
                type: "tool-call";
              }
            | {
                toolCallId: string;
                toolName: string;
                type: "tool-call-streaming-start";
              }
            | {
                argsTextDelta: string;
                toolCallId: string;
                toolName: string;
                type: "tool-call-delta";
              }
            | {
                args?: any;
                experimental_content?: Array<
                  | { text: string; type: "text" }
                  | { data: string; mimeType?: string; type: "image" }
                >;
                isError?: boolean;
                providerOptions?: Record<string, Record<string, any>>;
                result: any;
                toolCallId: string;
                toolName: string;
                type: "tool-result";
              }
          >;
          start: number;
          streamId: string;
        };
        streamId: string;
      },
      null
    >;
    list: FunctionReference<
      "query",
      "public",
      { threadId: string },
      Array<{
        agentName?: string;
        model?: string;
        order: number;
        provider?: string;
        providerOptions?: Record<string, Record<string, any>>;
        stepOrder: number;
        streamId: string;
        userId?: string;
      }>
    >;
    listDeltas: FunctionReference<
      "query",
      "public",
      {
        cursors: Array<{ cursor: number; streamId: string }>;
        threadId: string;
      },
      Array<{
        end: number;
        parts: Array<
          | { textDelta: string; type: "text-delta" }
          | { textDelta: string; type: "reasoning" }
          | {
              source: {
                id: string;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                url: string;
              };
              type: "source";
            }
          | {
              args: any;
              providerOptions?: Record<string, Record<string, any>>;
              toolCallId: string;
              toolName: string;
              type: "tool-call";
            }
          | {
              toolCallId: string;
              toolName: string;
              type: "tool-call-streaming-start";
            }
          | {
              argsTextDelta: string;
              toolCallId: string;
              toolName: string;
              type: "tool-call-delta";
            }
          | {
              args?: any;
              experimental_content?: Array<
                | { text: string; type: "text" }
                | { data: string; mimeType?: string; type: "image" }
              >;
              isError?: boolean;
              providerOptions?: Record<string, Record<string, any>>;
              result: any;
              toolCallId: string;
              toolName: string;
              type: "tool-result";
            }
        >;
        start: number;
        streamId: string;
      }>
    >;
  };
  threads: {
    createThread: FunctionReference<
      "mutation",
      "public",
      {
        defaultSystemPrompt?: string;
        parentThreadIds?: Array<string>;
        summary?: string;
        title?: string;
        userId?: string;
      },
      {
        _creationTime: number;
        _id: string;
        status: "active" | "archived";
        summary?: string;
        title?: string;
        userId?: string;
      }
    >;
    deleteAllForThreadIdAsync: FunctionReference<
      "mutation",
      "public",
      { cursor?: string; limit?: number; threadId: string },
      { cursor: string; isDone: boolean }
    >;
    deleteAllForThreadIdSync: FunctionReference<
      "action",
      "public",
      { cursor?: string; limit?: number; threadId: string },
      null
    >;
    getThread: FunctionReference<
      "query",
      "public",
      { threadId: string },
      {
        _creationTime: number;
        _id: string;
        status: "active" | "archived";
        summary?: string;
        title?: string;
        userId?: string;
      } | null
    >;
    listThreadsByUserId: FunctionReference<
      "query",
      "public",
      {
        order?: "asc" | "desc";
        paginationOpts?: {
          cursor: string | null;
          endCursor?: string | null;
          id?: number;
          maximumBytesRead?: number;
          maximumRowsRead?: number;
          numItems: number;
        };
        userId?: string;
      },
      {
        continueCursor: string;
        isDone: boolean;
        page: Array<{
          _creationTime: number;
          _id: string;
          status: "active" | "archived";
          summary?: string;
          title?: string;
          userId?: string;
        }>;
        pageStatus?: "SplitRecommended" | "SplitRequired" | null;
        splitCursor?: string | null;
      }
    >;
    updateThread: FunctionReference<
      "mutation",
      "public",
      {
        patch: {
          status?: "active" | "archived";
          summary?: string;
          title?: string;
        };
        threadId: string;
      },
      {
        _creationTime: number;
        _id: string;
        status: "active" | "archived";
        summary?: string;
        title?: string;
        userId?: string;
      }
    >;
  };
  users: {
    deleteAllForUserId: FunctionReference<
      "action",
      "public",
      { userId: string },
      null
    >;
    deleteAllForUserIdAsync: FunctionReference<
      "mutation",
      "public",
      { userId: string },
      boolean
    >;
    listUsersWithThreads: FunctionReference<
      "query",
      "public",
      {
        paginationOpts: {
          cursor: string | null;
          endCursor?: string | null;
          id?: number;
          maximumBytesRead?: number;
          maximumRowsRead?: number;
          numItems: number;
        };
      },
      {
        continueCursor: string;
        isDone: boolean;
        page: Array<string>;
        pageStatus?: "SplitRecommended" | "SplitRequired" | null;
        splitCursor?: string | null;
      }
    >;
  };
  vector: {
    index: {
      deleteBatch: FunctionReference<
        "mutation",
        "public",
        {
          ids: Array<
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
          >;
        },
        null
      >;
      deleteBatchForThread: FunctionReference<
        "mutation",
        "public",
        {
          cursor?: string;
          limit: number;
          model: string;
          threadId: string;
          vectorDimension:
            | 128
            | 256
            | 512
            | 768
            | 1024
            | 1408
            | 1536
            | 2048
            | 3072
            | 4096;
        },
        { continueCursor: string; isDone: boolean }
      >;
      insertBatch: FunctionReference<
        "mutation",
        "public",
        {
          vectorDimension:
            | 128
            | 256
            | 512
            | 768
            | 1024
            | 1408
            | 1536
            | 2048
            | 3072
            | 4096;
          vectors: Array<{
            model: string;
            table: string;
            threadId?: string;
            userId?: string;
            vector: Array<number>;
          }>;
        },
        null
      >;
      paginate: FunctionReference<
        "query",
        "public",
        {
          cursor?: string;
          limit: number;
          table?: string;
          targetModel: string;
          vectorDimension:
            | 128
            | 256
            | 512
            | 768
            | 1024
            | 1408
            | 1536
            | 2048
            | 3072
            | 4096;
        },
        {
          continueCursor: string;
          ids: Array<
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
          >;
          isDone: boolean;
        }
      >;
      updateBatch: FunctionReference<
        "mutation",
        "public",
        {
          vectors: Array<{
            id:
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string
              | string;
            model: string;
            vector: Array<number>;
          }>;
        },
        null
      >;
    };
  };
};
// For now fullApiWithMounts is only fullApi which provides
// jump-to-definition in component client code.
// Use Mounts for the same type without the inference.
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
