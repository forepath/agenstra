# MCP Definitions

Model Context Protocol (MCP) server definitions in `.agenstra/mcp-definitions/`. Used to configure local or remote MCP servers for Cursor and OpenCode.

## Purpose

MCP definitions describe how to run or connect to MCP servers (e.g. file system, databases, APIs). The transformer maps them into each tool’s native format: Cursor uses a single `.cursor/mcp.json` with a `mcpServers` object; OpenCode uses an `mcp` object in `opencode.json`.

## Structure

- **Location**: `.agenstra/mcp-definitions/`
- **Format**: JSON (`.mcp.json`)
- **Naming**: Descriptive name (e.g. `file-system.mcp.json`); the filename stem or `id` inside the JSON is the server id

## Schema (properties read by the reader)

Only the following JSON properties are read; all others are ignored. `id`, `name`, and `description` are kept by design (name/description are not emitted by transformers).

**Common fields**:

| Field         | Type    | Description                                             |
| ------------- | ------- | ------------------------------------------------------- |
| `id`          | string  | Server identifier (optional; defaults to filename stem) |
| `name`        | string  | Display name (read only; not emitted)                   |
| `description` | string  | Short description (read only; not emitted)              |
| `type`        | string  | `"local"` or `"remote"`                                 |
| `enabled`     | boolean | Optional; default true                                  |

**Local servers** (run a command on the machine):

| Field         | Type               | Description                                                                     |
| ------------- | ------------------ | ------------------------------------------------------------------------------- |
| `command`     | string \| string[] | Command to run. If array, first element is the command, rest are args           |
| `environment` | object             | Optional env vars (Cursor uses `env`; may be written as `environment` or `env`) |
| `env`         | object             | Alias for `environment`                                                         |

**Remote servers** (connect to a URL):

| Field     | Type   | Description                                  |
| --------- | ------ | -------------------------------------------- |
| `url`     | string | MCP server URL                               |
| `headers` | object | Optional HTTP headers (e.g. `Authorization`) |

The `args` field (for local commands when `command` is a string) is also read.

## Example (local)

```json
{
  "id": "file-system",
  "type": "local",
  "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "${workspaceFolder}"],
  "environment": {},
  "enabled": true
}
```

Cursor resolves `${workspaceFolder}` from the project that contains `.cursor/mcp.json`. OpenCode may use a similar variable; check OpenCode docs for interpolation.

## Example (remote)

```json
{
  "id": "my-api",
  "type": "remote",
  "url": "https://api.example.com/mcp",
  "headers": {
    "Authorization": "Bearer ${env:MCP_API_KEY}"
  },
  "enabled": true
}
```

## Output by tool

- **Cursor** – Single `.cursor/mcp.json` with `mcpServers: { "<id>": { "command", "args", "env" } }` for local, or `{ "url", "headers" }` for remote. Command array becomes `command` (first element) + `args` (rest); `environment`/`env` → `env`.
- **OpenCode** – Top-level `mcp` in `opencode.json`: `mcp: { "<id>": { "type", "command" (array), "environment", "url", "headers", "enabled" } }` per [OpenCode MCP docs](https://opencode.ai/docs/mcp-servers/).
- **GitHub Copilot** – MCP is configured via Copilot/GitHub tooling; the current transformer does not emit Copilot MCP config from `.agenstra` MCP definitions.

## Related

- [Agents](./agents.md) – Agents can reference MCP servers via `mcp` or `tools`
- [README](./README.md) – Overview of `.agenstra/` and transformation
