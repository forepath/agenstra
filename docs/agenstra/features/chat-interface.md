# Chat Interface

AI chat functionality with real-time responses. Send messages to agents and receive instant responses.

## Overview

The chat interface enables real-time bidirectional communication with AI agents. Messages are sent via WebSocket and responses are received instantly. Chat history is automatically maintained and restored on reconnection.

## Features

### Real-time Communication

- Send messages to agents
- Receive instant responses
- View chat history
- Markdown rendering
- Code block syntax highlighting

### Message Types

#### User Messages

Messages sent by the user to the agent:

```typescript
{
  from: 'user',
  text: 'Hello, agent!',
  timestamp: '2024-01-01T00:00:00Z'
}
```

#### Agent Messages

Responses from the agent:

```typescript
{
  from: 'agent',
  response: {
    type: 'text',
    result: 'Hello, user!'
  },
  timestamp: '2024-01-01T00:00:00Z'
}
```

### Chat History

- Chat history is automatically saved
- History is restored on reconnection
- History is cleared when switching agents
- Old events are cleared to prevent duplicates

## Usage

### Sending a Message

1. Type your message in the input field
2. Press Enter or click Send
3. Message is sent to the agent via WebSocket
4. Response is received and displayed

### Viewing History

- Scroll through chat history
- View previous messages
- See message timestamps
- View formatted responses (markdown, code blocks)

## Message Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant AC as Agent Controller
    participant AM as Agent Manager
    participant A as Agent Container

    U->>F: Send Message
    F->>AC: forward (chat, message)
    AC->>AM: forward (chat, message)
    AM->>A: Send Message (stdin)
    A-->>AM: Agent Response
    AM->>AM: Save Messages
    AM-->>AC: chatMessage (user)
    AM-->>AC: chatMessage (agent)
    AC-->>F: chatMessage (user)
    AC-->>F: chatMessage (agent)
    F->>F: Display Messages
    U->>U: View Response
```

## Related Documentation

- **[WebSocket Communication](./websocket-communication.md)** - Real-time communication details
- **[Agent Management](./agent-management.md)** - Agent authentication

---

_For detailed chat functionality, see the application and feature docs linked below._
