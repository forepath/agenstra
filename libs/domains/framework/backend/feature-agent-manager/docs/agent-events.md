# Agent events (streaming, tools, questions)

The agent-manager websocket gateway emits **two** parallel streams for chat:

- **`chatMessage`**: legacy transcript events (user message + final assistant message), used for history restore and backwards compatibility.
- **`chatEvent`**: structured event stream for **streaming deltas**, **tool call lifecycles**, and **questions back to the user**.

This design allows existing clients/providers to keep working while enabling OpenCode-style UX where tools and questions are rendered explicitly.

## `chatEvent` envelope

Each `chatEvent` event carries a `SuccessResponse<AgentEventEnvelope>` payload (see `spec/asyncapi.yaml`).

Fields:

- **`eventId`**: UUID for the event.
- **`agentId`**: agent UUID the event belongs to.
- **`correlationId`**: groups events that belong to the same user request.
- **`sequence`**: monotonic integer scoped to `correlationId` (enables deterministic ordering).
- **`timestamp`**: ISO timestamp for the event.
- **`kind`**: one of:
  - `userMessage`
  - `assistantDelta`
  - `assistantMessage`
  - `toolCall`
  - `toolResult`
  - `question`
  - `status`
  - `error`
- **`payload`**: kind-specific payload (JSON object).

## Persistence

Transcript messages are persisted to `agent_messages` as before.

Structured events are optionally persisted to **`agent_message_events`**:

- Stored: `userMessage`, `assistantMessage`, `toolCall`, `toolResult`, `question`, `status`, `error`
- Skipped by default: `assistantDelta` (high volume)

## Provider support

Providers expose capabilities via `getCapabilities()`:

- Providers like `cursor` and `opencode` can support streaming and structured events.
- Providers like `openclaw` intentionally do **not** support chat and should keep capabilities disabled.

## Mermaid

See `docs/agent-events.mmd` for a per-request event lifecycle diagram.
