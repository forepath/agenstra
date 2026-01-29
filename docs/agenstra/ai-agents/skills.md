# Skills

Domain-specific knowledge (patterns, best practices) as separate Markdown files in `.agenstra/skills/`.

## Purpose

Skills document reusable expertise (e.g. TypeScript patterns, testing strategies) that agents can load when relevant. Tools that support separate skill files get one file per skill; tools that do not receive skills merged into rules or instructions during transformation.

## Structure

- **Location**: `.agenstra/skills/`
- **Format**: Markdown (`.skill.md`)
- **Naming**: Descriptive name (e.g. `design-patterns.skill.md`, `testing-patterns.skill.md`)

The filename stem (without `.skill.md`) is the skill identifier. Agents reference skills in their config via paths like `skills/design-patterns.skill.md`.

## Content guidelines

- **Self-contained** – Each file should be understandable without requiring other skills.
- **Structured** – Use headings, lists, and code blocks so agents can parse and apply the content.
- **Referential** – You may reference rules or other docs; avoid duplicating long passages.

## Example

```markdown
# Design Patterns

## Factory Pattern

**When to use:** Creating objects of similar types with varying logic.

### Example structure

- Define a creator interface and concrete creators.
- Keep product creation in one place.

### Trade-offs

- Reduces coupling; adds an abstraction layer.
```

## Output by tool

- **Cursor** – One folder per skill under `.cursor/skills/<name>/` with a `SKILL.md` file (frontmatter: `name`, `description`).
- **OpenCode** – Skills remain available via the tool’s skill mechanism; see OpenCode docs.
- **GitHub Copilot** – Skills are merged into path-specific instructions (e.g. `.github/instructions/skills.instructions.md`) because Copilot does not support separate skill files.

## Related

- [Agents](./agents.md) – Agents reference skills via `skills: ["skills/design-patterns.skill.md", ...]`
- [Rules](./rules.md) – Rules vs. skills: rules are project instructions; skills are reusable knowledge
- [README](./README.md) – Overview of `.agenstra/` and transformation
