import { vEntry, vEntryId, vSearchResult } from "@convex-dev/memory";
import { defineTable } from "convex/server";
import { v } from "convex/values";

export default {
  // ragFilesBasic tables
  contextUsed: defineTable({
    messageId: v.string(),
    entries: v.array(vEntry),
    results: v.array(vSearchResult),
  }).index("messageId", ["messageId"]),
};
