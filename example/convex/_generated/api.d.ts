/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as example from "../example.js";

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
  example: typeof example;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  ai: {
    messages: {
      archiveChat: FunctionReference<
        "mutation",
        "internal",
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
        "internal",
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
        "internal",
        { domainId: string },
        null
      >;
      deleteAllForDomainIdAsync: FunctionReference<
        "mutation",
        "internal",
        { domainId: string },
        boolean
      >;
      getChat: FunctionReference<
        "query",
        "internal",
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
        "internal",
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
      updateChat: FunctionReference<
        "mutation",
        "internal",
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
    };
  };
};
