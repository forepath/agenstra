# Coding Standards

## Conventions

- Use strict mode where the language supports it
- Prefer immutability; avoid unnecessary mutation
- Prefer explicit types over implicit or untyped
- Use consistent indentation (document in project README)

## Structure

- Keep business logic in a dedicated layer
- Mirror test layout to source layout where possible
- Shared helpers live in a dedicated util or shared layer
- Avoid circular dependencies

## Error Handling

- Always include context in error messages (what failed, where, and why)
- Prefer typed or structured errors over string-only errors
