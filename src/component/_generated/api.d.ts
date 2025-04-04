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
}>;
export type Mounts = {
  messages: {
    addMessage: FunctionReference<
      "mutation",
      "public",
      {
        addPending?: boolean;
        chatId: string;
        failPendingSteps?: boolean;
        fileId?: string;
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
                        args?: any;
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
      },
      {
        message: {
          _creationTime: number;
          _id: string;
          chatId: string;
          fileId?: string;
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
                          args?: any;
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
          order: number;
          status: "pending" | "success" | "failed";
        };
        pending?: {
          _creationTime: number;
          _id: string;
          chatId: string;
          fileId?: string;
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
                          args?: any;
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
          order: number;
          status: "pending" | "success" | "failed";
        };
      }
    >;
    addSteps: FunctionReference<
      "mutation",
      "public",
      {
        chatId: string;
        failPreviousSteps?: boolean;
        messageId: string;
        steps: Array<{
          fileId?: string;
          step: {
            experimental_providerMetadata?: Record<string, any>;
            files?: Array<string>;
            finishReason:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            isContinued: boolean;
            logprobs?: Array<{
              logprob: number;
              token: string;
              topLogprobs: Array<{ logprob: number; token: string }>;
            }>;
            providerMetadata?: Record<string, any>;
            reasoning?: string;
            reasoningDetails?: Array<string>;
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
              messages: Array<{ content: string; id: string; role: string }>;
              modelId: string;
              timestamp: number;
            };
            sources?: Array<{ text: string; type: "source" }>;
            stepType: "initial" | "continue" | "tool-result";
            text: string;
            toolCalls: Array<{
              args?: any;
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
        }>;
      },
      Array<{
        _creationTime: number;
        _id: string;
        chatId: string;
        fileId?: string;
        messageId: string;
        order: number;
        status: "pending" | "success" | "failed";
        step: {
          experimental_providerMetadata?: Record<string, any>;
          files?: Array<string>;
          finishReason:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          isContinued: boolean;
          logprobs?: Array<{
            logprob: number;
            token: string;
            topLogprobs: Array<{ logprob: number; token: string }>;
          }>;
          providerMetadata?: Record<string, any>;
          reasoning?: string;
          reasoningDetails?: Array<string>;
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
            messages: Array<{ content: string; id: string; role: string }>;
            modelId: string;
            timestamp: number;
          };
          sources?: Array<{ text: string; type: "source" }>;
          stepType: "initial" | "continue" | "tool-result";
          text: string;
          toolCalls: Array<{
            args?: any;
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
      }>
    >;
    archiveChat: FunctionReference<
      "mutation",
      "public",
      { chatId: string },
      {
        _creationTime: number;
        _id: string;
        defaultSystemPrompt?: string;
        domainId?: string;
        order?: number;
        status: "active" | "archived";
        summary?: string;
        title?: string;
      }
    >;
    createChat: FunctionReference<
      "mutation",
      "public",
      {
        defaultSystemPrompt?: string;
        domainId?: string;
        summary?: string;
        title?: string;
      },
      {
        _creationTime: number;
        _id: string;
        defaultSystemPrompt?: string;
        domainId?: string;
        order?: number;
        status: "active" | "archived";
        summary?: string;
        title?: string;
      }
    >;
    deleteAllForDomainId: FunctionReference<
      "action",
      "public",
      { domainId: string },
      null
    >;
    deleteAllForDomainIdAsync: FunctionReference<
      "mutation",
      "public",
      { domainId: string },
      boolean
    >;
    getChat: FunctionReference<
      "query",
      "public",
      { chatId: string },
      {
        _creationTime: number;
        _id: string;
        defaultSystemPrompt?: string;
        domainId?: string;
        order?: number;
        status: "active" | "archived";
        summary?: string;
        title?: string;
      } | null
    >;
    getChatsByDomainId: FunctionReference<
      "query",
      "public",
      {
        cursor?: string | null;
        domainId: string;
        limit?: number;
        offset?: number;
        statuses?: Array<"active" | "archived">;
      },
      {
        chats: Array<{
          _creationTime: number;
          _id: string;
          defaultSystemPrompt?: string;
          domainId?: string;
          order?: number;
          status: "active" | "archived";
          summary?: string;
          title?: string;
        }>;
        continueCursor: string;
        isDone: boolean;
      }
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
    getMessages: FunctionReference<
      "query",
      "public",
      {
        chatId: string;
        cursor?: string;
        isStep?: boolean;
        limit?: number;
        order?: "asc" | "desc";
        orderOffset?: number;
        statuses?: Array<"pending" | "success" | "failed">;
      },
      {
        continueCursor: string;
        isDone: boolean;
        messages: Array<{
          _creationTime: number;
          _id: string;
          chatId: string;
          fileId?: string;
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
                          args?: any;
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
          order: number;
          status: "pending" | "success" | "failed";
        }>;
      }
    >;
    updateChat: FunctionReference<
      "mutation",
      "public",
      {
        chatId: string;
        patch: {
          defaultSystemPrompt?: string;
          status?: "active" | "archived";
          summary?: string;
          title?: string;
        };
      },
      {
        _creationTime: number;
        _id: string;
        defaultSystemPrompt?: string;
        domainId?: string;
        order?: number;
        status: "active" | "archived";
        summary?: string;
        title?: string;
      }
    >;
    updateMessage: FunctionReference<
      "mutation",
      "public",
      {
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
                        args?: any;
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
        messageId: string;
      },
      any
    >;
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
