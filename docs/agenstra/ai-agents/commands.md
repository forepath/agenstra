# Commands

Reusable slash-style commands with prompts and optional agent binding. Stored as **MDC** (YAML frontmatter + body) in `.agenstra/commands/`.

## Purpose

Commands define repeatable workflows (e.g. refactor, test generation, code review) that users can trigger by name. The transformer emits them in the format each tool expects (plain Markdown for Cursor, frontmatter Markdown for OpenCode).

## Structure

- **Location**: `.agenstra/commands/`
- **Format**: MDC (`.command.mdc`) – YAML frontmatter + body
- **Naming**: Descriptive name; the filename stem is the command key (e.g. `refactor.command.mdc` → key `refactor`)

The **body** (content below the frontmatter) is the **prompt** text. It can use placeholders like `{{pattern}}`.

## Frontmatter (properties read by the reader)

Only the following frontmatter fields are read; all others are ignored.

| Field         | Type   | Description                                              |
| ------------- | ------ | -------------------------------------------------------- |
| `id`          | string | Command identifier (optional; defaults to filename stem) |
| `name`        | string | Display name                                             |
| `description` | string | Short description for the UI                             |
| `agent`       | string | Optional agent id (OpenCode)                             |
| `model`       | string | Optional model override (OpenCode)                       |

## Example

```mdc
---
id: refactor-to-pattern
name: Apply Pattern Refactor
description: Refactor code to use a specific pattern
agent: architect
---

Refactor this code to use the {{pattern}} pattern. Follow the rules in #rules/architecture.mdc
```

## Output by tool

- **Cursor** – One `.md` file per command under `.cursor/commands/` (plain Markdown: title, description, prompt).
- **OpenCode** – One `.md` file per command under `.opencode/commands/` with YAML frontmatter (`description`, `agent`, `model`).
- **GitHub Copilot** – The transformer does not emit commands for Copilot. Configure Copilot prompts or instructions separately if needed.

## Related

- [Agents](./agents.md) – Reference an agent via `agent` for OpenCode (and Cursor where supported)
- [README](./README.md) – Overview of `.agenstra/` and transformation
