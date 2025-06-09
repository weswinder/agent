import { paginationOptsValidator } from "convex/server";
import { Agent, storeFile } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { chat, textEmbedding } from "../../../example/examplesModels";
import {
  action,
  ActionCtx,
  internalAction,
  mutation,
  MutationCtx,
  query,
  QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { getFile } from "@convex-dev/agent";
import {
  FilePart,
  ImagePart,
  experimental_generateImage as generateImage,
} from "ai";
import OpenAI from "openai";

// Define an agent similarly to the AI SDK
export const fileAgent = new Agent(components.agent, {
  name: "File Agent",
  chat: chat,
  textEmbedding: textEmbedding,
  instructions: "You are an expert in reviewing and analyzing files & images.",
});

// Step 1: Upload a file
export const uploadFile = action({
  args: {
    filename: v.string(),
    mimeType: v.string(),
    bytes: v.bytes(),
    sha256: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    // Maybe rate limit how often a user can upload a file / attribute?
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const {
      file: { fileId, url },
    } = await storeFile(
      ctx,
      components.agent,
      new Blob([args.bytes], { type: args.mimeType }),
      args.filename,
      args.sha256,
    );
    return { fileId, url };
  },
});

// Step 2: Submit a question about the file
export const submitFileQuestion = mutation({
  args: {
    fileId: v.string(),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const { threadId } = await fileAgent.createThread(ctx, { userId });
    const { filePart, imagePart } = await getFile(
      ctx,
      components.agent,
      args.fileId,
    );
    const { messageId } = await fileAgent.saveMessage(ctx, {
      threadId,
      message: {
        role: "user",
        content: [imagePart ?? filePart, { type: "text", text: args.question }],
      },
      // This will track the usage of the file, so we can delete old ones
      metadata: { fileIds: [args.fileId] },
    });
    await ctx.scheduler.runAfter(0, internal.filesImages.generateResponse, {
      threadId,
      promptMessageId: messageId,
    });
    return { threadId };
  },
});

// Step 3: Generate a response to the question asynchronously
export const generateResponse = internalAction({
  args: { threadId: v.string(), promptMessageId: v.string() },
  handler: async (ctx, { threadId, promptMessageId }) => {
    const { thread } = await fileAgent.continueThread(ctx, { threadId });
    await thread.generateText({ promptMessageId });
  },
});

// Step 4: Query the messages in a thread
export const listThreadMessages = query({
  args: { threadId: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const { threadId, paginationOpts } = args;
    await authorizeThreadAccess(ctx, threadId);
    return fileAgent.listMessages(ctx, {
      threadId,
      paginationOpts,
    });
  },
});

/**
 * Generating images
 */

// Generate an image and save it in an assistant message
// This differs in that it's saving the file implicitly by passing the bytes in.
// It will save the file and make a fileId automatically when the input file
// is too big (>100k).
export const generateImageOneShot = internalAction({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, { prompt }) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const { threadId } = await fileAgent.createThread(ctx, { userId });
    // Save the user message
    await fileAgent.saveMessage(ctx, { threadId, prompt });

    // Generate the image
    const imgResponse = await generateImage({
      model: openai.imageModel("gpt-image-1"),
      prompt,
      size: "1024x1024",
      n: 1,
      providerOptions: {
        openai: { quality: "low" },
      },
    });

    // Save the image in an assistant message
    const { message } = await fileAgent.saveMessage(ctx, {
      threadId,
      message: {
        role: "assistant",
        content: [
          {
            type: "file",
            // NOTE: passing in the bytes directly!
            data: imgResponse.image.uint8Array,
            mimeType: imgResponse.image.mimeType,
          } as FilePart,
        ],
      },
      metadata: {
        warnings: imgResponse.warnings,
        model: imgResponse.responses.at(-1)?.modelId,
        provider: "openai",
      },
    });
    return { threadId, assistantMessage: message };
  },
});

/**
 * ==============================
 * Functions for demo purposes.
 * In a real app, you'd use real authentication & authorization.
 * ==============================
 */

async function getUserId(_ctx: QueryCtx | MutationCtx | ActionCtx) {
  // For demo purposes. Usually you'd use auth here.
  return "storytelling user";
}

async function authorizeThreadAccess(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  threadId: string,
) {
  const userId = await getUserId(ctx);
  // For demo purposes. Usually you'd use auth here.
  if (!userId || !threadId || userId !== "storytelling user") {
    throw new Error("Unauthorized");
  }
}

/**
 * ==============================
 * Other ways of doing things:
 * ==============================
 */

// Expose an internal action that generates text, to avoid the boilerplate of
// generateResponse above.
export const generateResponse2 = fileAgent.asTextAction();

// Do it all in one action
export const submitAndGenerateResponseOneShot = action({
  args: {
    filename: v.string(),
    mimeType: v.string(),
    bytes: v.bytes(),
    sha256: v.optional(v.string()),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const { thread, threadId } = await fileAgent.createThread(ctx, { userId });
    // Note we can also pass in the file inline and it will automatically be
    // stored and tracked as a fileId!
    const part: ImagePart | FilePart = args.mimeType.startsWith("image/")
      ? { type: "image", image: args.bytes, mimeType: args.mimeType }
      : {
          type: "file",
          data: args.bytes,
          mimeType: args.mimeType,
          filename: args.filename,
        };
    const result = await thread.generateText({
      messages: [
        {
          role: "user",
          content: [part, { type: "text", text: args.question }],
        },
      ],
    });
    return {
      response: result.text,
      threadId,
    };
  },
});
