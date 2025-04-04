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
