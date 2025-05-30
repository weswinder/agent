# Changelog

## 0.1.2 alpha

- Added text delta streaming with `useThreadMessages` and `useStreamingThreadMessages` React hooks.
  See examples/chat-streaming for example usage.
- Allow listing threads without an associated userId in the playground.
- make stepOrder always increasing, for more predictable sorting of failed + non-failed messages.
- A reference to the agent is now passed to tool calls using the `createTool` utility.
- In more places, we aren't storing the AI SDK `id` unless explicitly passed in, and favoring the built-in Convex ID instead.
- The examples/ folder will become a better resource with more specific examples.
  For now, there's an index page when running the examples, that points to the text streaming and weather demos.
- There's now `listMessages` `saveMessage`, and `asSaveMessagesMutation` on the Agent.
  `listMessages` is compliant with the normal pagination API.

### Breaking

- `components.agent.messages.listMessagesByThreadId` is now `asc`ending by default!
  It'll have a type error to help you out.
  While you're at it, you can use the new `.listMessages` on the agent itself!
- `addStep` now returns the messages it created instead of a step.
  This is not likely to be called by clients directly. It's mostly used internally.
- `toUIMessages` has been moved to the `@convex-dev/agent/react` import entrypoint.

## 0.1.1

- The file api has been improved to allow for upserting files more correctly.
  You can use it to track images and files in messages, and have a cron that queries for images that can be safely deleted.
  When adding it to a message, call `addFile`, `useExistingFile`, or `copyFile` to get the `fileId` and add it to the message metadata.
  When the message is deleted, it will delete the file (if it has the last reference to it).
- Added an example for passing in images to LLMs.
- Embeddings of length 1408 are now supported.

## 0.1.0

- UI Playground, to host locally or embed into your app.
  - On the left panel it has a dropdown to select a users, then lists the user's treads
  - In the middle you can see the thread's messages and tool calls, as well as send new messages in the thread:
    - Configurable context & message saving options
    - Play with the system prompt for rapid prototyping.
  - On the right you can see the selected message's details, as well as fetch contextual messages to investigate what messages would get fetched for that message, with configurable ContextOptions.
  - Use the [hosted version](https://get-convex.github.io/agent/) or run it locally with `npx @convex-dev/agent-playground` - uses Vite internally for now.
  - API key management (to authenticate into the UI Playground)
- The `order` and `stepOrder` is now well defined: each call to something like `generateText` will be on the next "order" and each message generated from it will have increasing "subOrder" indexes.
- Adds a function to turn MessageDoc[] into UIMessage[].
- Eliminates an index to reduce storage cost per-message.
- The README is a better resource.

### Breaking

- `agent.fetchContextMessages` now returns `MessageDoc` instead of a `CoreMessage` objects.
- `isTool` configuration for context has been changed to `excludeToolMessages` - where `false`/`undefined` is the default and includes tool messages, and `true` will only return user/assistant messages.
- Reorganization of API (split `agent.messages.*` into `agent.threads.*`, `agent.messages.*`, `agent.files.*`, and `agent.users.*`.
- Parameters like `parentMessageId` have generally been renamed to `promptMessageId` or `beforeMessageId` or `upToAndIncludingMessageId` to better clarify their use for things like using an existing message as a prompt or searching context from before a message, or fetching messages up to and including a given message. The `generate*` / `stream*` functions can take a `promptMessageId` instead of a `prompt` / `messages` arg now.
- Calls to steps and objects now take a parentMessageId instead of messageId parameter, as this is the true meaning of parent message (the message being responded to).

### Deprecated

- The `steps` table is going away, to be replaced with a callback where you can dump your own comprehensive debug information if/when you want to. As such, the `stepId` field isn't returned on messages.
- The `parentMessageId` field is no longer exposed. Its purpose is now filled by the order & stepOrder fields: each message with the same order is a child of the message at stepOrder 0.

## 0.0.16

- Fixes a bug with providing out-of-order tool messages in the prompt context. (author: @apostolisCodpal)

## 0.0.15

- You can pass tools at the agent definition, thread definition, or per-message call, making it easier to define tools at runtime with runtime context.

- README improvements

### Breaking Changes

- `getEmbeddings` has been renamed to `generateEmbeddings`

### Deprecated

- Passing `ConfigOptions` and `StorageOptions` should now be passed as separate parameters via `configOptions` and `storageOptions`.
  e.g. for `generateText`
  `{ prompt }, { contextOptions: { recentMessages: 10 } }` instead of
  `{ prompt, recentMessages: 10 }`

## 0.0.14

- There is now a usageHandler you can specify on the Agent definition, thread, or per-message that can log or save token usage history.

- The model and provider are being stored on the messages table, along with usage, warnings, and other fields previously hidden away in the steps table.

### Bug fixes

- The agent name is now correctly propagating to the messages table for non-user messages.

### Deprecated

- parentThreadIds is deprecated, as it wasn't merging histories and the desire to do so should have a message as its parent to make the history behavior clear.
