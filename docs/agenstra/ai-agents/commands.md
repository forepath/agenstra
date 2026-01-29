# Commands

Reusable slash-style commands with prompts and optional agent binding. Stored as JSON in `.agenstra/commands/`.

## Purpose

Commands define repeatable workflows (e.g. refactor, test generation, code review) that users can trigger by name. The transformer emits them in the format each tool expects (plain Markdown for Cursor, frontmatter Markdown for OpenCode).

## Structure

- **Location**: `.agenstra/commands/`
- **Format**: JSON (`.command.json`)
- **Naming**: Descriptive name; the filename stem becomes the command id (e.g. `refactor-to-pattern.command.json` → id `refactor-to-pattern`)

## Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Command identifier (optional; defaults to filename stem) |
| `name` | string | Display name |
| `description` | string | Short description for the UI |
| `prompt` | string | The prompt text (can use placeholders like `{{pattern}}`) |
| `variables` | string[] | Optional list of variable names used in the prompt |
| `context` | string[] | Optional references (e.g. `["rules/architecture.md"]`) |
| `agent` | string | Optional agent id to run the command with |
| `model` | string | Optional model override (OpenCode) |

## Example

```json
{
  "id": "refactor-to-pattern",
  "name": "Apply Pattern Refactor",
  "description": "Refactor code to use a specific pattern",
  "prompt": "Refactor this code to use the {{pattern}} pattern. Follow the rules in #rules/architecture.md",
  "variables": ["pattern"],
  "context": ["rules/architecture.md"],
  "agent": "architect"
}
```

## Output by tool

- **Cursor** – One `.md` file per command under `.cursor/commands/` (plain Markdown: title, description, prompt).
- **OpenCode** – One `.md` file per command under `.opencode/commands/` with YAML frontmatter (`description`, `agent`, `model`).
- **GitHub Copilot** – Commands can be reflected in path-specific instructions; see transformer and Copilot docs for details.

## Related

- [Agents](./agents.md) – Reference an agent via `agent` for OpenCode/Cursor
- [README](./README.md) – Overview of `.agenstra/` and transformation
