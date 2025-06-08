import type { Id } from "../component/_generated/dataModel.js";
import type { ActionCtx, AgentComponent } from "./types.js";
import type { RunMutationCtx } from "@convex-dev/prosemirror-sync";

/**
 * Store a file in the file storage and return the URL and fileId.
 * @param ctx A ctx object from an action.
 * @param component The agent component.
 * @param blob The blob to store.
 * @param filename The filename to store.
 * @param sha256 The sha256 hash of the file. If not provided, it will be
 *   computed. However, to ensure no corruption during transfer, you can
 *   calculate this on the client to enforce integrity.
 * @returns The URL, fileId, and storageId of the stored file.
 */
export async function storeFile(
  ctx: ActionCtx | RunMutationCtx,
  component: AgentComponent,
  blob: Blob,
  filename?: string,
  sha256?: string
): Promise<{ url: string; fileId: string; storageId: Id<"_storage"> }> {
  if (!("runAction" in ctx)) {
    throw new Error(
      "You're trying to save a file that's too large in a mutation. " +
        "You can store the file in file storage from an action first, then pass a URL instead. " +
        "To have the agent component track the file, you can use `saveFile` from an action then use the fileId with getFile in the mutation. " +
        "Read more in the docs."
    );
  }
  const hash =
    sha256 ||
    crypto.subtle.digest("SHA-256", await blob.arrayBuffer()).toString();
  const reused = await ctx.runMutation(component.files.useExistingFile, {
    hash,
    filename,
  });
  if (reused) {
    return {
      url: (await ctx.storage.getUrl(reused.storageId))!,
      fileId: reused.fileId,
      storageId: reused.storageId as Id<"_storage">,
    };
  }
  const newStorageId = await ctx.storage.store(blob, {
    sha256: hash,
  });
  const { fileId, storageId } = await ctx.runMutation(component.files.addFile, {
    storageId: newStorageId,
    hash,
    filename,
  });
  const url = (await ctx.storage.getUrl(storageId as Id<"_storage">))!;
  if (storageId !== newStorageId) {
    // We're re-using another file's storageId
    // Because we try to reuse the file above, this should be very very rare
    // and only in the case of racing to check then store the file.
    await ctx.storage.delete(newStorageId);
  }
  return { url, fileId, storageId: storageId as Id<"_storage"> };
}
