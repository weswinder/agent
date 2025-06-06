import { ContextOptions, StorageOptions } from "@convex-dev/agent";

// TODO: store preferences in local storage
export const DEFAULT_CONTEXT_OPTIONS = {
  recentMessages: 10,
  excludeToolMessages: false,
  searchOtherThreads: false,
  searchOptions: {
    limit: 0,
    textSearch: true,
    vectorSearch: true,
    messageRange: { before: 2, after: 1 },
  },
} as const satisfies ContextOptions;

export const DEFAULT_STORAGE_OPTIONS = {
  saveMessages: "promptAndOutput",
} as const satisfies StorageOptions;
