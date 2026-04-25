# Message Filter Rules

Agenstra supports **regex-based message filter rules** at two levels: **global** rules on the agent controller (synced to workspaces) and **per-agent** rules on each agent manager. Together they control how chat traffic is evaluated, dropped, or flagged before or during agent processing.

## Overview

- **Global rules (controller)** – Stored on the agent controller. Only **administrators** may list, create, update, or delete them via `/api/filter-rules`. Responses include a summary of how rules apply per workspace where relevant (see OpenAPI).
- **Per-agent rules (manager)** – Stored on the agent manager for a specific deployment. CRUD is available at `/api/agents-filters` (and by id) with normal agent-manager HTTP authentication.

The console exposes global rule management on route **`/filters`** (admin guard). Per-agent rules are managed in agent context through the same APIs the UI calls via the controller proxy where applicable.

## Why two tiers?

- **Global** – Organization-wide policies (PII patterns, banned phrases, uniform compliance) pushed consistently across clients/workspaces the controller manages.
- **Per-agent** – Fine tuning for a single agent or team without changing global policy (experimentation, repo-specific jargon).

Rule **priority** and matching semantics are defined in the OpenAPI schemas (`CreateFilterRuleDto`, `CreateRegexFilterRuleDto`, etc.). Dropped and flagged messages contribute to [Usage Statistics](./usage-statistics.md) endpoints.

## Related documentation

- **[Chat Interface](./chat-interface.md)** – Where filtered traffic originates
- **[Usage Statistics](./usage-statistics.md)** – Filter drops and flags metrics
- **[Backend Agent Controller](../applications/backend-agent-controller.md)** – `/filter-rules`
- **[Backend Agent Manager](../applications/backend-agent-manager.md)** – `/agents-filters`

## API references

- [Agent Controller OpenAPI](/spec/agent-controller/openapi.yaml) – `/filter-rules`, `/filter-rules/{id}`
- [Agent Manager OpenAPI](/spec/agent-manager/openapi.yaml) – `/agents-filters`, `/agents-filters/count`, `/agents-filters/{id}`

---

_For validation rules, priority ordering, and sync behavior, use the OpenAPI specifications._
