# Changelog

## 0.0.17 alpha

- UI Playground, to host locally or embed into your app.
- API key management (to authenticate into the UI Playground)
- The README is a better resource.

### Breaking

- `isTool` configuration for context has been changed to `excludeToolMessages` - where `false`/`undefined` is the default and includes tool messages, and `true` will only return user/assistant messages.
- Reorganization of API (split `agent.messages.*` into `agent.threads.*`, `agent.messages.*`, `agent.files.*`, and `agent.users.*`.
- Parameters like `parentMessageId` have generally been renamed to `beforeMessageId` to better clarify their use for things like looking up context. The `generate*` / `stream*` functions do not take a parentMessageId.
- Calls to steps and objects now take a parentMessageId instead of messageId parameter, as this is the true meaning of parent message (the message being responded to).
- `agent.fetchContextMessages` now returns `MessageDoc` instead of a `CoreMessage` objects.

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
