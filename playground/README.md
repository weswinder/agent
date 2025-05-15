# Agent Playground

This is a prototype of the agent playground for @convex-dev/agent.

# etc

Generated on Loveable with this prompt:

```
I want to build a chat admin interface for conversations with one or more LLM agents. It should be Vite with Tailwind and Shadcn, but only a single page app with no server functions or RSC.

On the left panel:

- a dropdown to pick users
- A list of threads for that user with a title, subtitle, greyed out latest message, creation time and last message time (using dayjs)
- When selected, the chat in the middle panel shows the messages for that channel
- At the bottom of the list there should be a "load more" button

On the middle panel:

- A list of messages with either text or image content. each message should be annotated with either a user or bot 🤖indicator - if it's a bot it should show the agent name
- If the message has tool calls, show them as nested messages with a 🧰 icon, with a dropdown to see the details (the args to the tool call and the return value)
- On the right of the message there should show how many seconds it took to generate.
- When a message is selected, the right panel shows the message details

On the right panel:

- The full message object as JSON in a code block
- A section to send a new message to the agent:
  - A dropdown to pick the agent
  - A collapsible section with "Context Options" showing the options as editable JSON with syntax highlighting
  - A collapsible section with "Storage Options" showing the options as editable JSON with syntax highlighting
  - A text area to enter the message
  - A button to send the message
  - A message section showing the response from the most recent prompt
- A section to show what context messages were used to generate the response
  - A list of messages
  - A column on the left with a checkmark if the message was found with vector search
    - in parentheses the rank of the message via vector search
  - A column on the right with a checkmark if the message was found with text search
    - in parentheses the rank of the message via text search
```
