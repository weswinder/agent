/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as lib from "../lib.js";
import type * as messages from "../messages.js";
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
  lib: typeof lib;
  messages: typeof messages;
  "vector/index": typeof vector_index;
  "vector/tables": typeof vector_tables;
}>;
export type Mounts = {
  messages: {
    addMessages: FunctionReference<
      "mutation",
      "public",
      {
        agentName?: string;
        embeddings?: {
          dimension: 128 | 256 | 512 | 768 | 1024 | 1536 | 2048 | 3072 | 4096;
          model: string;
          vectors: Array<Array<number> | null>;
        };
        failPendingSteps?: boolean;
        messages: Array<{
          fileId?: string;
          id?: string;
          message:
            | {
                content:
                  | string
                  | Array<
                      | {
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          text: string;
                          type: "text";
                        }
                      | {
                          experimental_providerMetadata?: Record<string, any>;
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, any>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          experimental_providerMetadata?: Record<string, any>;
                          mimeType: string;
                          providerOptions?: Record<string, any>;
                          type: "file";
                        }
                    >;
                experimental_providerMetadata?: Record<string, any>;
                providerOptions?: Record<string, any>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          experimental_providerMetadata?: Record<string, any>;
                          mimeType: string;
                          providerOptions?: Record<string, any>;
                          type: "file";
                        }
                      | {
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                    >;
                experimental_providerMetadata?: Record<string, any>;
                providerOptions?: Record<string, any>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  experimental_providerMetadata?: Record<string, any>;
                  isError?: boolean;
                  providerOptions?: Record<string, any>;
                  result: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                experimental_providerMetadata?: Record<string, any>;
                providerOptions?: Record<string, any>;
                role: "tool";
              }
            | {
                content: string;
                experimental_providerMetadata?: Record<string, any>;
                providerOptions?: Record<string, any>;
                role: "system";
              };
        }>;
        model?: string;
        parentMessageId?: string;
        pending?: boolean;
        stepId?: string;
        threadId: string;
        userId?: string;
      },
      {
        messages: Array<{
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?:
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string;
          error?: string;
          fileId?: string;
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          text: string;
                          type: "text";
                        }
                      | {
                          experimental_providerMetadata?: Record<string, any>;
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, any>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          experimental_providerMetadata?: Record<string, any>;
                          mimeType: string;
                          providerOptions?: Record<string, any>;
                          type: "file";
                        }
                    >;
                experimental_providerMetadata?: Record<string, any>;
                providerOptions?: Record<string, any>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          experimental_providerMetadata?: Record<string, any>;
                          mimeType: string;
                          providerOptions?: Record<string, any>;
                          type: "file";
                        }
                      | {
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                    >;
                experimental_providerMetadata?: Record<string, any>;
                providerOptions?: Record<string, any>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  experimental_providerMetadata?: Record<string, any>;
                  isError?: boolean;
                  providerOptions?: Record<string, any>;
                  result: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                experimental_providerMetadata?: Record<string, any>;
                providerOptions?: Record<string, any>;
                role: "tool";
              }
            | {
                content: string;
                experimental_providerMetadata?: Record<string, any>;
                providerOptions?: Record<string, any>;
                role: "system";
              };
          model?: string;
          order: number;
          parentMessageId?: string;
          status: "pending" | "success" | "failed";
          stepId?: string;
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          userId?: string;
        }>;
        pending?: {
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?:
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string;
          error?: string;
          fileId?: string;
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          text: string;
                          type: "text";
                        }
                      | {
                          experimental_providerMetadata?: Record<string, any>;
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, any>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          experimental_providerMetadata?: Record<string, any>;
                          mimeType: string;
                          providerOptions?: Record<string, any>;
                          type: "file";
                        }
                    >;
                experimental_providerMetadata?: Record<string, any>;
                providerOptions?: Record<string, any>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          experimental_providerMetadata?: Record<string, any>;
                          mimeType: string;
                          providerOptions?: Record<string, any>;
                          type: "file";
                        }
                      | {
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                    >;
                experimental_providerMetadata?: Record<string, any>;
                providerOptions?: Record<string, any>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  experimental_providerMetadata?: Record<string, any>;
                  isError?: boolean;
                  providerOptions?: Record<string, any>;
                  result: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                experimental_providerMetadata?: Record<string, any>;
                providerOptions?: Record<string, any>;
                role: "tool";
              }
            | {
                content: string;
                experimental_providerMetadata?: Record<string, any>;
                providerOptions?: Record<string, any>;
                role: "system";
              };
          model?: string;
          order: number;
          parentMessageId?: string;
          status: "pending" | "success" | "failed";
          stepId?: string;
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          userId?: string;
        };
      }
    >;
    addStep: FunctionReference<
      "mutation",
      "public",
      {
        embeddings?: {
          dimension: 128 | 256 | 512 | 768 | 1024 | 1536 | 2048 | 3072 | 4096;
          model: string;
          vectors: Array<Array<number> | null>;
        };
        failPendingSteps?: boolean;
        messageId: string;
        step: {
          messages: Array<{
            fileId?: string;
            id?: string;
            message:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            experimental_providerMetadata?: Record<string, any>;
                            providerOptions?: Record<string, any>;
                            text: string;
                            type: "text";
                          }
                        | {
                            experimental_providerMetadata?: Record<string, any>;
                            image: string | ArrayBuffer;
                            mimeType?: string;
                            providerOptions?: Record<string, any>;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            experimental_providerMetadata?: Record<string, any>;
                            mimeType: string;
                            providerOptions?: Record<string, any>;
                            type: "file";
                          }
                      >;
                  experimental_providerMetadata?: Record<string, any>;
                  providerOptions?: Record<string, any>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            experimental_providerMetadata?: Record<string, any>;
                            providerOptions?: Record<string, any>;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            experimental_providerMetadata?: Record<string, any>;
                            mimeType: string;
                            providerOptions?: Record<string, any>;
                            type: "file";
                          }
                        | {
                            experimental_providerMetadata?: Record<string, any>;
                            providerOptions?: Record<string, any>;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            experimental_providerMetadata?: Record<string, any>;
                            providerOptions?: Record<string, any>;
                            type: "redacted-reasoning";
                          }
                        | {
                            args: any;
                            experimental_providerMetadata?: Record<string, any>;
                            providerOptions?: Record<string, any>;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                      >;
                  experimental_providerMetadata?: Record<string, any>;
                  providerOptions?: Record<string, any>;
                  role: "assistant";
                }
              | {
                  content: Array<{
                    args?: any;
                    experimental_content?: Array<
                      | { text: string; type: "text" }
                      | { data: string; mimeType?: string; type: "image" }
                    >;
                    experimental_providerMetadata?: Record<string, any>;
                    isError?: boolean;
                    providerOptions?: Record<string, any>;
                    result: any;
                    toolCallId: string;
                    toolName: string;
                    type: "tool-result";
                  }>;
                  experimental_providerMetadata?: Record<string, any>;
                  providerOptions?: Record<string, any>;
                  role: "tool";
                }
              | {
                  content: string;
                  experimental_providerMetadata?: Record<string, any>;
                  providerOptions?: Record<string, any>;
                  role: "system";
                };
          }>;
          step: {
            experimental_providerMetadata?: Record<string, any>;
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
            providerMetadata?: Record<string, any>;
            providerOptions?: Record<string, any>;
            reasoning?: string;
            reasoningDetails?: Array<any>;
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
                                experimental_providerMetadata?: Record<
                                  string,
                                  any
                                >;
                                providerOptions?: Record<string, any>;
                                text: string;
                                type: "text";
                              }
                            | {
                                experimental_providerMetadata?: Record<
                                  string,
                                  any
                                >;
                                image: string | ArrayBuffer;
                                mimeType?: string;
                                providerOptions?: Record<string, any>;
                                type: "image";
                              }
                            | {
                                data: string | ArrayBuffer;
                                experimental_providerMetadata?: Record<
                                  string,
                                  any
                                >;
                                mimeType: string;
                                providerOptions?: Record<string, any>;
                                type: "file";
                              }
                          >;
                      experimental_providerMetadata?: Record<string, any>;
                      providerOptions?: Record<string, any>;
                      role: "user";
                    }
                  | {
                      content:
                        | string
                        | Array<
                            | {
                                experimental_providerMetadata?: Record<
                                  string,
                                  any
                                >;
                                providerOptions?: Record<string, any>;
                                text: string;
                                type: "text";
                              }
                            | {
                                data: string | ArrayBuffer;
                                experimental_providerMetadata?: Record<
                                  string,
                                  any
                                >;
                                mimeType: string;
                                providerOptions?: Record<string, any>;
                                type: "file";
                              }
                            | {
                                experimental_providerMetadata?: Record<
                                  string,
                                  any
                                >;
                                providerOptions?: Record<string, any>;
                                text: string;
                                type: "reasoning";
                              }
                            | {
                                data: string;
                                experimental_providerMetadata?: Record<
                                  string,
                                  any
                                >;
                                providerOptions?: Record<string, any>;
                                type: "redacted-reasoning";
                              }
                            | {
                                args: any;
                                experimental_providerMetadata?: Record<
                                  string,
                                  any
                                >;
                                providerOptions?: Record<string, any>;
                                toolCallId: string;
                                toolName: string;
                                type: "tool-call";
                              }
                          >;
                      experimental_providerMetadata?: Record<string, any>;
                      providerOptions?: Record<string, any>;
                      role: "assistant";
                    }
                  | {
                      content: Array<{
                        args?: any;
                        experimental_content?: Array<
                          | { text: string; type: "text" }
                          | { data: string; mimeType?: string; type: "image" }
                        >;
                        experimental_providerMetadata?: Record<string, any>;
                        isError?: boolean;
                        providerOptions?: Record<string, any>;
                        result: any;
                        toolCallId: string;
                        toolName: string;
                        type: "tool-result";
                      }>;
                      experimental_providerMetadata?: Record<string, any>;
                      providerOptions?: Record<string, any>;
                      role: "tool";
                    }
                  | {
                      content: string;
                      experimental_providerMetadata?: Record<string, any>;
                      providerOptions?: Record<string, any>;
                      role: "system";
                    };
              }>;
              modelId: string;
              timestamp: number;
            };
            sources?: Array<{
              id: string;
              providerMetadata?: Record<string, any>;
              sourceType: "url";
              title?: string;
              url: string;
            }>;
            stepType: "initial" | "continue" | "tool-result";
            text: string;
            toolCalls: Array<{
              args: any;
              experimental_providerMetadata?: Record<string, any>;
              providerOptions?: Record<string, any>;
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
              experimental_providerMetadata?: Record<string, any>;
              isError?: boolean;
              providerOptions?: Record<string, any>;
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
      },
      Array<{
        _creationTime: number;
        _id: string;
        order: number;
        parentMessageId: string;
        status: "pending" | "success" | "failed";
        step: {
          experimental_providerMetadata?: Record<string, any>;
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
          providerMetadata?: Record<string, any>;
          providerOptions?: Record<string, any>;
          reasoning?: string;
          reasoningDetails?: Array<any>;
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
                              experimental_providerMetadata?: Record<
                                string,
                                any
                              >;
                              providerOptions?: Record<string, any>;
                              text: string;
                              type: "text";
                            }
                          | {
                              experimental_providerMetadata?: Record<
                                string,
                                any
                              >;
                              image: string | ArrayBuffer;
                              mimeType?: string;
                              providerOptions?: Record<string, any>;
                              type: "image";
                            }
                          | {
                              data: string | ArrayBuffer;
                              experimental_providerMetadata?: Record<
                                string,
                                any
                              >;
                              mimeType: string;
                              providerOptions?: Record<string, any>;
                              type: "file";
                            }
                        >;
                    experimental_providerMetadata?: Record<string, any>;
                    providerOptions?: Record<string, any>;
                    role: "user";
                  }
                | {
                    content:
                      | string
                      | Array<
                          | {
                              experimental_providerMetadata?: Record<
                                string,
                                any
                              >;
                              providerOptions?: Record<string, any>;
                              text: string;
                              type: "text";
                            }
                          | {
                              data: string | ArrayBuffer;
                              experimental_providerMetadata?: Record<
                                string,
                                any
                              >;
                              mimeType: string;
                              providerOptions?: Record<string, any>;
                              type: "file";
                            }
                          | {
                              experimental_providerMetadata?: Record<
                                string,
                                any
                              >;
                              providerOptions?: Record<string, any>;
                              text: string;
                              type: "reasoning";
                            }
                          | {
                              data: string;
                              experimental_providerMetadata?: Record<
                                string,
                                any
                              >;
                              providerOptions?: Record<string, any>;
                              type: "redacted-reasoning";
                            }
                          | {
                              args: any;
                              experimental_providerMetadata?: Record<
                                string,
                                any
                              >;
                              providerOptions?: Record<string, any>;
                              toolCallId: string;
                              toolName: string;
                              type: "tool-call";
                            }
                        >;
                    experimental_providerMetadata?: Record<string, any>;
                    providerOptions?: Record<string, any>;
                    role: "assistant";
                  }
                | {
                    content: Array<{
                      args?: any;
                      experimental_content?: Array<
                        | { text: string; type: "text" }
                        | { data: string; mimeType?: string; type: "image" }
                      >;
                      experimental_providerMetadata?: Record<string, any>;
                      isError?: boolean;
                      providerOptions?: Record<string, any>;
                      result: any;
                      toolCallId: string;
                      toolName: string;
                      type: "tool-result";
                    }>;
                    experimental_providerMetadata?: Record<string, any>;
                    providerOptions?: Record<string, any>;
                    role: "tool";
                  }
                | {
                    content: string;
                    experimental_providerMetadata?: Record<string, any>;
                    providerOptions?: Record<string, any>;
                    role: "system";
                  };
            }>;
            modelId: string;
            timestamp: number;
          };
          sources?: Array<{
            id: string;
            providerMetadata?: Record<string, any>;
            sourceType: "url";
            title?: string;
            url: string;
          }>;
          stepType: "initial" | "continue" | "tool-result";
          text: string;
          toolCalls: Array<{
            args: any;
            experimental_providerMetadata?: Record<string, any>;
            providerOptions?: Record<string, any>;
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
            experimental_providerMetadata?: Record<string, any>;
            isError?: boolean;
            providerOptions?: Record<string, any>;
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
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        };
        stepOrder: number;
        threadId: string;
      }>
    >;
    archiveThread: FunctionReference<
      "mutation",
      "public",
      { threadId: string },
      {
        _creationTime: number;
        _id: string;
        defaultSystemPrompt?: string;
        order?: number;
        parentThreadIds?: Array<string>;
        status: "active" | "archived";
        summary?: string;
        title?: string;
        userId?: string;
      }
    >;
    commitMessage: FunctionReference<
      "mutation",
      "public",
      { messageId: string },
      null
    >;
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
        defaultSystemPrompt?: string;
        order?: number;
        parentThreadIds?: Array<string>;
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
      { cursor: string; isDone: boolean }
    >;
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
    getThread: FunctionReference<
      "query",
      "public",
      { threadId: string },
      {
        _creationTime: number;
        _id: string;
        defaultSystemPrompt?: string;
        order?: number;
        parentThreadIds?: Array<string>;
        status: "active" | "archived";
        summary?: string;
        title?: string;
        userId?: string;
      } | null
    >;
    getThreadMessages: FunctionReference<
      "query",
      "public",
      {
        cursor?: string;
        isTool?: boolean;
        limit?: number;
        order?: "asc" | "desc";
        parentMessageId?: string;
        statuses?: Array<"pending" | "success" | "failed">;
        threadId: string;
      },
      {
        continueCursor: string;
        isDone: boolean;
        messages: Array<{
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?:
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string
            | string;
          error?: string;
          fileId?: string;
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          text: string;
                          type: "text";
                        }
                      | {
                          experimental_providerMetadata?: Record<string, any>;
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, any>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          experimental_providerMetadata?: Record<string, any>;
                          mimeType: string;
                          providerOptions?: Record<string, any>;
                          type: "file";
                        }
                    >;
                experimental_providerMetadata?: Record<string, any>;
                providerOptions?: Record<string, any>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          experimental_providerMetadata?: Record<string, any>;
                          mimeType: string;
                          providerOptions?: Record<string, any>;
                          type: "file";
                        }
                      | {
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          experimental_providerMetadata?: Record<string, any>;
                          providerOptions?: Record<string, any>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                    >;
                experimental_providerMetadata?: Record<string, any>;
                providerOptions?: Record<string, any>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  experimental_providerMetadata?: Record<string, any>;
                  isError?: boolean;
                  providerOptions?: Record<string, any>;
                  result: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                experimental_providerMetadata?: Record<string, any>;
                providerOptions?: Record<string, any>;
                role: "tool";
              }
            | {
                content: string;
                experimental_providerMetadata?: Record<string, any>;
                providerOptions?: Record<string, any>;
                role: "system";
              };
          model?: string;
          order: number;
          parentMessageId?: string;
          status: "pending" | "success" | "failed";
          stepId?: string;
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          userId?: string;
        }>;
      }
    >;
    getThreadsByUserId: FunctionReference<
      "query",
      "public",
      {
        cursor?: string | null;
        limit?: number;
        offset?: number;
        statuses?: "active" | "archived";
        userId: string;
      },
      {
        continueCursor: string;
        isDone: boolean;
        threads: Array<{
          _creationTime: number;
          _id: string;
          defaultSystemPrompt?: string;
          order?: number;
          parentThreadIds?: Array<string>;
          status: "active" | "archived";
          summary?: string;
          title?: string;
          userId?: string;
        }>;
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
        limit: number;
        messageRange?: { after: number; before: number };
        parentMessageId?: string;
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
        embeddingId?:
          | string
          | string
          | string
          | string
          | string
          | string
          | string
          | string
          | string;
        error?: string;
        fileId?: string;
        id?: string;
        message?:
          | {
              content:
                | string
                | Array<
                    | {
                        experimental_providerMetadata?: Record<string, any>;
                        providerOptions?: Record<string, any>;
                        text: string;
                        type: "text";
                      }
                    | {
                        experimental_providerMetadata?: Record<string, any>;
                        image: string | ArrayBuffer;
                        mimeType?: string;
                        providerOptions?: Record<string, any>;
                        type: "image";
                      }
                    | {
                        data: string | ArrayBuffer;
                        experimental_providerMetadata?: Record<string, any>;
                        mimeType: string;
                        providerOptions?: Record<string, any>;
                        type: "file";
                      }
                  >;
              experimental_providerMetadata?: Record<string, any>;
              providerOptions?: Record<string, any>;
              role: "user";
            }
          | {
              content:
                | string
                | Array<
                    | {
                        experimental_providerMetadata?: Record<string, any>;
                        providerOptions?: Record<string, any>;
                        text: string;
                        type: "text";
                      }
                    | {
                        data: string | ArrayBuffer;
                        experimental_providerMetadata?: Record<string, any>;
                        mimeType: string;
                        providerOptions?: Record<string, any>;
                        type: "file";
                      }
                    | {
                        experimental_providerMetadata?: Record<string, any>;
                        providerOptions?: Record<string, any>;
                        text: string;
                        type: "reasoning";
                      }
                    | {
                        data: string;
                        experimental_providerMetadata?: Record<string, any>;
                        providerOptions?: Record<string, any>;
                        type: "redacted-reasoning";
                      }
                    | {
                        args: any;
                        experimental_providerMetadata?: Record<string, any>;
                        providerOptions?: Record<string, any>;
                        toolCallId: string;
                        toolName: string;
                        type: "tool-call";
                      }
                  >;
              experimental_providerMetadata?: Record<string, any>;
              providerOptions?: Record<string, any>;
              role: "assistant";
            }
          | {
              content: Array<{
                args?: any;
                experimental_content?: Array<
                  | { text: string; type: "text" }
                  | { data: string; mimeType?: string; type: "image" }
                >;
                experimental_providerMetadata?: Record<string, any>;
                isError?: boolean;
                providerOptions?: Record<string, any>;
                result: any;
                toolCallId: string;
                toolName: string;
                type: "tool-result";
              }>;
              experimental_providerMetadata?: Record<string, any>;
              providerOptions?: Record<string, any>;
              role: "tool";
            }
          | {
              content: string;
              experimental_providerMetadata?: Record<string, any>;
              providerOptions?: Record<string, any>;
              role: "system";
            };
        model?: string;
        order: number;
        parentMessageId?: string;
        status: "pending" | "success" | "failed";
        stepId?: string;
        stepOrder: number;
        text?: string;
        threadId: string;
        tool: boolean;
        userId?: string;
      }>
    >;
    textSearch: FunctionReference<
      "query",
      "public",
      { limit: number; text: string; threadId?: string; userId?: string },
      Array<{
        _creationTime: number;
        _id: string;
        agentName?: string;
        embeddingId?:
          | string
          | string
          | string
          | string
          | string
          | string
          | string
          | string
          | string;
        error?: string;
        fileId?: string;
        id?: string;
        message?:
          | {
              content:
                | string
                | Array<
                    | {
                        experimental_providerMetadata?: Record<string, any>;
                        providerOptions?: Record<string, any>;
                        text: string;
                        type: "text";
                      }
                    | {
                        experimental_providerMetadata?: Record<string, any>;
                        image: string | ArrayBuffer;
                        mimeType?: string;
                        providerOptions?: Record<string, any>;
                        type: "image";
                      }
                    | {
                        data: string | ArrayBuffer;
                        experimental_providerMetadata?: Record<string, any>;
                        mimeType: string;
                        providerOptions?: Record<string, any>;
                        type: "file";
                      }
                  >;
              experimental_providerMetadata?: Record<string, any>;
              providerOptions?: Record<string, any>;
              role: "user";
            }
          | {
              content:
                | string
                | Array<
                    | {
                        experimental_providerMetadata?: Record<string, any>;
                        providerOptions?: Record<string, any>;
                        text: string;
                        type: "text";
                      }
                    | {
                        data: string | ArrayBuffer;
                        experimental_providerMetadata?: Record<string, any>;
                        mimeType: string;
                        providerOptions?: Record<string, any>;
                        type: "file";
                      }
                    | {
                        experimental_providerMetadata?: Record<string, any>;
                        providerOptions?: Record<string, any>;
                        text: string;
                        type: "reasoning";
                      }
                    | {
                        data: string;
                        experimental_providerMetadata?: Record<string, any>;
                        providerOptions?: Record<string, any>;
                        type: "redacted-reasoning";
                      }
                    | {
                        args: any;
                        experimental_providerMetadata?: Record<string, any>;
                        providerOptions?: Record<string, any>;
                        toolCallId: string;
                        toolName: string;
                        type: "tool-call";
                      }
                  >;
              experimental_providerMetadata?: Record<string, any>;
              providerOptions?: Record<string, any>;
              role: "assistant";
            }
          | {
              content: Array<{
                args?: any;
                experimental_content?: Array<
                  | { text: string; type: "text" }
                  | { data: string; mimeType?: string; type: "image" }
                >;
                experimental_providerMetadata?: Record<string, any>;
                isError?: boolean;
                providerOptions?: Record<string, any>;
                result: any;
                toolCallId: string;
                toolName: string;
                type: "tool-result";
              }>;
              experimental_providerMetadata?: Record<string, any>;
              providerOptions?: Record<string, any>;
              role: "tool";
            }
          | {
              content: string;
              experimental_providerMetadata?: Record<string, any>;
              providerOptions?: Record<string, any>;
              role: "system";
            };
        model?: string;
        order: number;
        parentMessageId?: string;
        status: "pending" | "success" | "failed";
        stepId?: string;
        stepOrder: number;
        text?: string;
        threadId: string;
        tool: boolean;
        userId?: string;
      }>
    >;
    updateThread: FunctionReference<
      "mutation",
      "public",
      {
        patch: {
          defaultSystemPrompt?: string;
          status?: "active" | "archived";
          summary?: string;
          title?: string;
        };
        threadId: string;
      },
      {
        _creationTime: number;
        _id: string;
        defaultSystemPrompt?: string;
        order?: number;
        parentThreadIds?: Array<string>;
        status: "active" | "archived";
        summary?: string;
        title?: string;
        userId?: string;
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
