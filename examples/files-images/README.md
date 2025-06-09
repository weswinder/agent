# Images and Files Example

This example shows how to use the `@convex-dev/agent` component to work with
images and files.

See [filesImages.ts](./convex/filesImages.ts) for the server-side code.
and [FilesImages.tsx](./src/FilesImages.tsx) for the client-side code.

## Sending an image by uploading first and generating asynchronously

The standard approach is to:

1. Upload the file to the database (`uploadFile` action). Note: this can be in
  a regular action or in an httpAction, depending on what's more convenient.
2. Send a message to the thread (`submitFileQuestion` action)
3. Send the file to the LLM to generate / stream text asynchronously
  (`generateResponse` action)
4. Query for the messages from the thread (`listThreadMessages` query)

Rationale:

It's better to submit a message in a mutation vs. an action because you can use
an optimistic update on the client side to show the sent message immediately and
have it disappear exactly when the message comes down in the query.

However, you can't save to file storage from a mutation, so the file needs to
already exist (hence the fileId).

You can then asynchronously generate the response (with retries / etc) without
the client waiting.

### 1: Saving the file

```ts
    const { file } = await storeFile(
      ctx,
      components.agent,
      new Blob([bytes], { type: mimeType }),
      filename,
      sha256,
    );
    const { fileId, url, storageId } = file;
```

### 2: Sending the message

```ts
// in your mutation
    const { filePart, imagePart } = await getFile(
      ctx,
      components.agent,
      fileId,
    );
    const { messageId } = await fileAgent.saveMessage(ctx, {
      threadId,
      message: {
        role: "user",
        content: [
          imagePart ?? filePart, // if it's an image, prefer that kind.
          { type: "text", text: "What is this image?" }
        ],
      },
      metadata: { fileIds: [fileId] }, // IMPORTANT: this tracks the file usage.
    });
```

### 3: Generating the response & querying the responses

This is done in the same way as text inputs.

```ts
// in an action
await thread.generateText({ promptMessageId: messageId });
```

```ts
// in a query
const messages = await agent.listMessages(ctx, { threadId, paginationOpts });
```

## Inline saving approach

You can also pass in an image / file direction when generating text, if you're
in an action. Any image or file passed in the `message` argument will
automatically be saved in file storage if it's larger than 64k, and a fileId
will be saved to the message.

Example:

```ts
await thread.generateText({
  message: {
    role: "user",
    content: [
      { type: "image", image: imageBytes, mimeType: "image/png" },
      { type: "text", text: "What is this image?" }
    ]
  }
});
```

## Under the hood

Saving to the files has 3 components:

1. Saving to file storage (in your app, not in the component's storage).
  This means you can access it directly with the `storageId` and generate URLs.
2. Saving a reference (the storageId) to the file in the component. This will
  automatically keep track of how many messages are referencing the file, so you
  can vacuum files that are no longer used (see [crons.ts](./convex/crons.ts)).
3. Inserting a URL in place of the data in the message sent to the LLM, along
  with the mimeType and other metadata provided
  (or [inferred](../../src/mapping.ts#L220)).

### Can I just store the file myself an pass in a URL?

Yes! You can always pass a URL in the place of an image or file to the LLM.

```ts
const storageId = await ctx.storage.store(blob)
const url = await ctx.storage.getUrl(storageId);

await thread.generateText({
  message: {
    role: "user",
    content: [
      { type: "image", data: url, mimeType: blob.type },
      { type: "text", text: "What is this image?" }
    ]
  }
});
```


## Generating images

There's an example in [filesImages.ts](./convex/filesImages.ts#L216) that
takes a prompt, generates an image with OpenAI's dall-e 2, then saves the image
to a thread.

You can try it out with:

```sh
// in the examples/files-images directory, after you've started the backend
npx convex run filesImages:generateImageOneShot '{prompt: "make a picture of a cat" }'
```

## Running the example

NOTE: Sending URLs to LLMs is much easier with the cloud backend, since it has
publicly available storage URLs. To develop locally you can use `ngrok` or
similar to proxy the traffic.

```sh
npm run setup
cd examples/chat-streaming
npm i
npm run dev
```
