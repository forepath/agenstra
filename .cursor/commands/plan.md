# Plan Command

This guide defines the **REQUIRED** steps and best practices for planning new features in the monorepo. All contributors **MUST** follow these steps to ensure consistency, maintainability, and reliability across the codebase.

> The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

## 1. Assessment

- You **MUST** review the relevant documentation, domain rules, and architectural guidelines before starting.
- You **MUST** identify the affected applications, domains, and libraries.
- You **SHOULD** check for existing issues, RFCs, or related work to avoid duplication.
- You **MUST** ensure the feature aligns with the monorepo's dependency and modularity rules.
- You **SHOULD** consult with stakeholders or team members if the feature impacts multiple domains or applications.
- You **MUST** review any existing research that may inform the planning process.
  - A research file reference **MAY** be provided within the chat history or as explicit reference.
  - If research is needed but not available, you **SHOULD** recommend conducting research using [Research Guidelines](./research.md) before proceeding with planning.
- You **MAY** summarize relevant research findings for context optimization so long as requirements are not lost in the process.

## 2. Planning

- You **MUST** break down the feature into actionable tasks and subcomponents.
- You **MUST** use Nx generators and tooling where applicable to scaffold new libraries, components, or modules.
  - You **SHOULD** prefer the usage of generators from the package `@agenstra/code`.
  - You **MAY** use other nx generators if the functionality is not sufficient.
- You **MUST** determine the appropriate location (application, domain, library) for each part of the feature, following naming and structure conventions.
- You **SHOULD** create or update an issue or RFC describing the planned changes, including acceptance criteria.
- You **MUST** plan for test coverage, documentation, and validation steps.
- You **SHOULD** consider backward compatibility and document any breaking changes.

## 3. Documentation

- You **MUST** document your planning results in a Markdown (`.md`) file placed in the root-level `.plans/` directory.
- The plan file **MUST** be named using the format: `YYYYMMDD_HHMMSS_feature_name.md` (e.g., `.plans/20240607_153000_user_auth_redesign.md`), using snake_case for the feature name and a concise, descriptive feature name.
- You **MUST** reference the full path to the plan file in related issues, pull requests, and documentation for traceability, and clearly state its location for further processing.
- You **MUST** use the [`template.md`](../../.plans/template.md) file from the root-level `.plans/` directory as the base structure for your plan file. Copy its contents and fill in the relevant sections when creating a new plan.

## 4. Confirmation

- You **MUST** wait for confirmation before implementing any changes.
