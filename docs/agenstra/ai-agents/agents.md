# Agents and Subagents

Primary agents and subagents defined as **MDC files** (YAML frontmatter + body) in `.agenstra/agents/` and `.agenstra/subagents/`.

## Purpose

Agents are specialized AI roles (e.g. architect, code reviewer). Subagents are focused helpers that a primary agent can invoke (e.g. general research, exploration). Each is a separate `.agent.mdc` or `.subagent.mdc` file so you can version and reuse them. The transformer emits them in the format each tool expects (Cursor `.md` in `.cursor/agents/`, OpenCode `.md` in `.opencode/agents/`, GitHub Copilot instructions for primary agents and subagents).

## Structure

- **Primary agents**: `.agenstra/agents/` – files named `<name>.agent.mdc`
- **Subagents**: `.agenstra/subagents/` – files named `<name>.subagent.mdc`

Each file is **MDC** (Markdown with frontmatter): a YAML block between `---` delimiters for metadata, then a Markdown body for the prompt/instructions. The **filename stem** (e.g. `architect` from `architect.agent.mdc`) is the agent id used in output filenames and references. The frontmatter may also include an `id` field for display or compatibility.

## Frontmatter (properties read by the reader)

Only the following frontmatter fields are read; all others are ignored.

**All tools (Cursor, OpenCode, GitHub Copilot)**:

| Field         | Type   | Description                                |
| ------------- | ------ | ------------------------------------------ |
| `id`          | string | Optional identifier (output key is filename stem) |
| `name`        | string | Display name                               |
| `description` | string | Short description for the model and UI     |

**OpenCode only** (emitted to [OpenCode agent Markdown](https://opencode.ai/docs/agents/#markdown)):

| Field         | Type             | Description                                                                 |
| ------------- | ---------------- | --------------------------------------------------------------------------- |
| `mode`        | string           | `"primary"` or `"subagent"`                                                 |
| `temperature` | number           | Optional model temperature                                                  |
| `model`       | string           | Optional model override                                                     |
| `tools`       | object           | Tool access: `write`, `edit`, `bash` (each `true` or `false`). Controls what the agent is allowed to do. |

**Body**: The content below the frontmatter is the agent’s **prompt/instructions**. It is emitted as the main body by all tools. If the body is empty, the transformer uses `description` as the body.

## Example (primary agent)

```mdc
---
id: code-architect
name: Code Architect Agent
description: Designs architecture and breaks down tasks into implementable units
mode: primary
temperature: 0.2
tools:
  write: false
  edit: false
  bash: false
---

Execute tasks according to the agent configuration.
```

## Example (subagent)

```mdc
---
id: general
name: General Agent
description: General agent for general tasks
mode: subagent
tools:
  write: true
  edit: true
  bash: true
---

General instructions here.
```

## Output by tool

- **Cursor** – Primary agents and subagents → `.cursor/agents/<id>.md` (Markdown with frontmatter `name`, `description` and body from MDC body or description).
- **OpenCode** – All agents and subagents → `.opencode/agents/<id>.md` with frontmatter (`description`, `mode`, `model`, `temperature`, `tools`) and body from MDC body or description. The `tools` object is written as YAML (e.g. `write: false`, `edit: false`, `bash: false`) per [OpenCode agents docs](https://opencode.ai/docs/agents/#markdown).
- **GitHub Copilot** – Primary agents and subagents → `.github/instructions/agents.instructions.md` (section per agent; Copilot does not support separate subagent configs).

## Related

- [Rules](./rules.md) – Project instructions
- [Skills](./skills.md) – Reusable knowledge
- [MCP definitions](./mcp-definitions.md) – MCP server config
- [README](./README.md) – Overview of `.agenstra/` and transformation
