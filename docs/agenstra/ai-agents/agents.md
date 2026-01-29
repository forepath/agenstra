# Agents and Subagents

Primary agents and subagents defined as JSON in `.agenstra/agents/` and `.agenstra/subagents/`.

## Purpose

Agents are specialized AI roles (e.g. architect, code reviewer). Subagents are focused helpers that a primary agent can invoke (e.g. general research, exploration). Each is a separate JSON file so you can version and reuse them across projects. The transformer emits them in the format each tool expects (Cursor `.md` in `agents/` and `subagents/`, OpenCode `.md` in `agents/`, GitHub Copilot instructions for primary agents only).

## Structure

- **Primary agents**: `.agenstra/agents/` – files named `<name>.agent.json`
- **Subagents**: `.agenstra/subagents/` – files named `<name>.subagent.json`

The **filename stem** (e.g. `architect` from `architect.agent.json`) is the agent id used in output filenames and references. The JSON may also contain an `id` field for display or compatibility.

## Agent schema (primary)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Optional identifier (output key is filename stem) |
| `name` | string | Display name |
| `description` | string | Short description for the model and UI |
| `mode` | string | `"primary"` for main agents |
| `rules` | string[] | Paths to rules (e.g. `["rules/architecture.md"]`) |
| `skills` | string[] | Paths to skills (e.g. `["skills/design-patterns.skill.md"]`) |
| `constraints` | string[] | Hard constraints the agent must follow |
| `temperature` | number | Optional; model temperature |
| `tools` | object \| string | Tool access (e.g. `"*"` or `{ "write": true, "edit": true }`) |
| `mcp` | string[] | Optional MCP server ids |
| `handoffAgents` | string[] | Optional ids of agents this agent can hand off to |

## Subagent schema

Same idea as primary agents; use `mode: "subagent"`. Subagents often have broader tool access (e.g. `"tools": "*"`) and fewer rules. Not all tools support subagents (e.g. GitHub Copilot does not); the transformer emits them only where supported.

## Example (primary agent)

```json
{
  "id": "code-architect",
  "name": "Code Architect Agent",
  "description": "Designs architecture and breaks down tasks into implementable units",
  "mode": "primary",
  "rules": ["rules/architecture.md", "rules/coding-standards.md"],
  "skills": ["skills/design-patterns.skill.md"],
  "constraints": [
    "Do not implement features; only design them",
    "Always justify technology selections"
  ],
  "temperature": 0.2
}
```

## Example (subagent)

```json
{
  "id": "general",
  "name": "General Subagent",
  "description": "General-purpose agent for research and multi-step tasks",
  "mode": "subagent",
  "rules": ["rules/coding-standards.md"],
  "tools": "*"
}
```

## Output by tool

- **Cursor** – Primary agents → `.cursor/agents/<id>.md`; subagents → `.cursor/subagents/<id>.md` (Markdown with frontmatter `name`, `description` and body from description + constraints).
- **OpenCode** – All agents and subagents → `.opencode/agents/<id>.md` with frontmatter (`description`, `mode`, `model`, `temperature`, `tools`) and prompt body.
- **GitHub Copilot** – Only **primary agents** are emitted into `.github/instructions/agents.instructions.md`; subagents are omitted because Copilot does not support them.

## Related

- [Rules](./rules.md) – Referenced by agents in `rules`
- [Skills](./skills.md) – Referenced by agents in `skills`
- [MCP definitions](./mcp-definitions.md) – Referenced by agents in `mcp`
- [README](./README.md) – Overview of `.agenstra/` and transformation
