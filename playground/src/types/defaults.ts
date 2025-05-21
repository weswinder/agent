import { ContextOptions, StorageOptions } from "@convex-dev/agent";

// TODO: store preferences in local storage
export const DEFAULT_CONTEXT_OPTIONS: ContextOptions = {
  recentMessages: 10,
  excludeToolMessages: true,
  searchOtherThreads: false,
  searchOptions: {
    limit: 0,
    textSearch: true,
    vectorSearch: true,
    messageRange: { before: 2, after: 1 },
  },
};

export const DEFAULT_STORAGE_OPTIONS: StorageOptions = {
  saveAllInputMessages: false,
  saveAnyInputMessages: true,
  saveOutputMessages: true,
};
