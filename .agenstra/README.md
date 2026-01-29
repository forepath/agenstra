# Agenstra AI Context

This directory (`.agenstra/`) is the single source of truth for AI coding assistant context. It uses a tool-agnostic schema that can be transformed into configs for Cursor, OpenCode, GitHub Copilot, and others.

## Structure

- **schema-version.txt** – Schema version for compatibility checks
- **metadata.json** – Project metadata, default model, target tools
- **rules/** – Instruction-based rules (Markdown)
- **commands/** – Reusable command definitions (JSON)
- **skills/** – Reusable skill documentation (Markdown)
- **agents/** – Primary agent configurations (JSON)
- **subagents/** – Subagent configurations (JSON)
- **AGENTS.md** – Generic agent documentation (fallback for tools without specific transformers)
- **mcp-definitions/** – MCP (Model Context Protocol) tool definitions (JSON)

## Usage

This folder is the **example context** for the repo. The `@agenstra/ai` tool acts as a **transformer** from `.agenstra/` to tool-specific configs (e.g. `.cursor/`, OpenCode, GitHub Copilot). Run the transformer when implemented (e.g. `agenstra transform --path=.agenstra --target=cursor`). Do not remove or overwrite existing `.cursor` contents when copying context manually.
