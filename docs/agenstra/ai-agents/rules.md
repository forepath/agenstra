# Rules

Project-wide instructions for AI agents: coding standards, architecture, testing, and security. Stored as Markdown in `.agenstra/rules/`.

## Purpose

Rules provide persistent context so the AI follows your project’s conventions. They are transformed into tool-specific formats (Cursor `.mdc`, OpenCode aggregated `AGENTS.md`, GitHub Copilot repository instructions).

## Structure

- **Location**: `.agenstra/rules/`
- **Format**: Markdown (`.md`)
- **Naming**: Any descriptive name (e.g. `coding-standards.md`, `architecture.md`, `testing.md`, `security.md`)

Each file is a standalone document. The transformer uses the filename (without `.md`) as the rule identifier and derives a short description from the first heading or line.

## Content guidelines

- **Focused** – One concern per file (e.g. coding standards, architecture, testing).
- **Actionable** – Prefer concrete instructions over vague guidance.
- **Stable** – Avoid duplicating code; reference canonical examples or docs instead.

## Example

```markdown
# Coding Standards

## Conventions

- Use strict mode where the language supports it
- Prefer immutability; avoid unnecessary mutation
- Use consistent indentation (document in project README)

## Structure

- Keep business logic in a dedicated layer
- Mirror test layout to source layout where possible
```

## Output by tool

- **Cursor** – One `.mdc` file per rule under `.cursor/rules/` with frontmatter (`description`, `globs`, `alwaysApply`).
- **OpenCode** – All rules aggregated into a single `AGENTS.md` (project instructions).
- **GitHub Copilot** – Rules merged into `.github/copilot-instructions.md` and path-specific instructions where applicable.

## Related

- [Agents](./agents.md) – Agents can reference rules via `rules: ["rules/architecture.md", ...]`
- [README](./README.md) – Overview of `.agenstra/` and transformation
