# Basic Chat Example

This example shows how to use the `@convex-dev/agent` component to build a basic
chat application.

## Server setup

See [`listThreadMessages` in chatBasic.ts](./convex/chatBasic.ts) for the server-side code.

You have a function that allows paginating over messages.

```ts
import { paginationOptsValidator } from "convex/server";

 export const listThreadMessages = query({
   args: {
     threadId: v.string(),
     paginationOpts: paginationOptsValidator,
     //... other arguments you want
   },
   handler: async (ctx, { threadId, paginationOpts }): PaginationResult<MessageDoc> => {
     // await authorizeThreadAccess(ctx, threadId);
     const paginated = await agent.listMessages(ctx, { threadId, paginationOpts });
     // Here you could filter out / modify the documents
     return paginated;
   },
 });
```

### Client setup

See [ChatBasic.tsx](./src/ChatBasic.tsx) for the client-side code.

The crux is to use the `useThreadMessages` hook:

```ts
import { useThreadMessages } from "@convex-dev/agent/react";

// in the component
  const messages = useThreadMessages(
    api.chatBasic.listThreadMessages,
    { threadId },
    { initialNumItems: 10 },
  );
```

### Optimistic updates for sending messages

The `optimisticallySendMessage` function is a helper function for sending a
message, so you can optimistically show a message in the message list until the
mutation has completed on the server.

Pass in the query that you're using to list messages, and it will insert the
ephemeral message at the top of the list.

```ts
const sendMessage = useMutation(api.chatBasic.generateResponse)
  .withOptimisticUpdate(optimisticallySendMessage(api.chatBasic.listThreadMessages));
```

If your arguments don't include `{ threadId, prompt }` then you can use it as a
helper function in your optimistic update:

```ts
import { optimisticallySendMessage } from "@convex-dev/agent/react";

const sendMessage = useMutation(
  api.chatBasic.generateResponse,
).withOptimisticUpdate(
  (store, args) => {
    optimisticallySendMessage(api.chatBasic.listThreadMessages)(store, {
      threadId: /* get the threadId from your args / context */,
      prompt: /* change your args into the user prompt. */,
    })
  }
);
```

## Running the example

```sh
npm run setup
cd examples/chat-basic
npm i
npm run dev
```
