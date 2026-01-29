# AI Agents Context (.agenstra)

This section describes how to use the `.agenstra/` directory to configure AI coding assistants (Cursor, OpenCode, GitHub Copilot) from a single, tool-agnostic source.

## Overview

The `.agenstra/` context is a **single source of truth** for agent rules, commands, skills, agents, and tools. The `@agenstra/ai` transformer reads this directory and emits tool-specific configs so you can maintain one set of files and generate Cursor, OpenCode, and GitHub Copilot output as needed.

**Key characteristics**:

- **Tool-agnostic** – No vendor-specific syntax in the source files
- **Composable** – Rules, commands, skills, and agents are separate and reusable
- **Versionable** – Commit `.agenstra/` to git and share across the team
- **Transform on demand** – Generate tool configs with `nx` or the transformer API

## Directory Structure

```
.agenstra/
├── schema-version.txt     # Schema version (e.g. "1.0")
├── metadata.json          # Project metadata and tool list
├── rules/                 # Instruction-based rules (Markdown)
├── commands/              # Reusable prompts (JSON)
├── skills/                # Reusable skill docs (Markdown)
├── agents/                # Primary agent configs (JSON)
├── subagents/             # Subagent configs (JSON)
└── mcp-definitions/       # MCP server definitions (JSON)
```

## Components

### [Rules](./rules.md)

Project-wide instructions (coding standards, architecture, testing, security). Stored as Markdown in `rules/`. Transformed into Cursor rules (`.mdc`), OpenCode `AGENTS.md` (aggregated), and GitHub Copilot repository instructions.

### [Commands](./commands.md)

Reusable slash-style commands with prompts and optional agent binding. Stored as JSON in `commands/`. Transformed into Cursor commands (`.md`), OpenCode commands (`.md` with frontmatter), and path-specific Copilot instructions where applicable.

### [Skills](./skills.md)

Domain-specific knowledge (patterns, best practices) as separate Markdown files in `skills/`. Tools that support skills get them as separate files; others receive skills merged into rules or instructions.

### [Agents](./agents.md)

Primary agents and subagents defined as JSON in `agents/` and `subagents/`. Include description, mode, constraints, rules/skills references, and tool access. Transformed into Cursor agents/subagents (`.md`), OpenCode agents (`.md`), and GitHub Copilot agent instructions (primary agents only; Copilot does not support subagents).

### [MCP definitions](./mcp-definitions.md)

Model Context Protocol server definitions (local command or remote URL) in `mcp-definitions/`. Transformed into Cursor `.cursor/mcp.json` (single `mcpServers` object) and OpenCode `opencode.json` (`mcp` object).

## Generating tool configs

After editing `.agenstra/`, generate output for one or more tools:

**Via Nx** (if the project has an `agenstra-transform` target):

```bash
nx run my-app:agenstra-transform --target=cursor,opencode,github-copilot --outputDir=generated
```

**Via API**:

```ts
import { transform } from '@agenstra/ai';

transform({
  source: '.agenstra',
  target: ['cursor', 'opencode', 'github-copilot'],
  outputDir: 'generated',
  dryRun: false,
});
```

Output is written under `outputDir/<tool>/` (e.g. `generated/cursor/`, `generated/opencode/`, `generated/github-copilot/`). Copy or symlink the generated folders into your project root as needed (e.g. `generated/cursor/.cursor` → `.cursor`).

## Related documentation

- **[Applications](../applications/README.md)** – Backend and frontend applications

---

_For detailed component schemas and examples, see the individual documentation pages._
