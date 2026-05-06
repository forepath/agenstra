# Compliance and standards (EU CRA and BSI IT‑Grundschutz)

This page summarizes how Agenstra’s documented security posture relates to **EU Cyber Resilience Act (CRA)** expectations and themes used in **BSI IT‑Grundschutz** and typical **ISMS** practice (e.g. ISO/IEC 27001 risk treatment). It is **informative**, not legal advice; align final conformity and audit evidence with your legal and certification advisors.

## EU Cyber Resilience Act (CRA) — practical mapping

CRA emphasizes **secure by design**, **protection against known threat classes**, **vulnerability handling**, and **transparent technical documentation** for products with digital elements.

| Theme                                 | How Agenstra addresses it (high level)                                                                                                                                                                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Security by design / default**      | Production **requires** explicit `AUTHENTICATION_METHOD`; agent-controller **exits** if `CLIENT_ENDPOINT_ALLOWED_HOSTS` is unset; HTTPS expectations for client endpoints and runtime config in production; WebSocket CORS **empty** in production unless `WEBSOCKET_CORS_ORIGIN` is set. |
| **Protection against common classes** | DTO validation, origin allowlist on unsafe methods, throttling, encrypted columns with production `ENCRYPTION_KEY`, SSRF guardrails for `CONFIG` and client endpoints, DNS checks, proxy requests that **strip** caller credential headers, log redaction helpers.                        |
| **Vulnerability handling**            | Report channel and process in **[Vulnerability reporting and artifacts](./vulnerability-reporting-and-artifacts.md)**; dependency scanning in CI (project pipelines).                                                                                                                     |
| **Documentation / transparency**      | This security section, **[Environment configuration](../deployment/environment-configuration.md)**, SBOM path in **[Vulnerability reporting and artifacts](./vulnerability-reporting-and-artifacts.md)**, and **[Accepted risks](./accepted-risks.md)**.                                  |

Residual exposure (e.g. **client** credentials still sent to customer-configured `client.endpoint`, permissive CSP for Monaco) is **named** and tracked—not left implicit.

## BSI IT‑Grundschutz / ISMS-oriented alignment

IT‑Grundschutz modules stress **access control**, **secure configuration**, **logging**, **malware / integrity**, and **operational continuity**. For organizational certification you typically need:

- **Risk treatment decisions** (mitigate, transfer, avoid, **accept**) with **owner**, **date**, and **review**
- **Compensating controls** where baseline hardening is not met

Agenstra’s **[Accepted risks](./accepted-risks.md)** register (**AR-001**–**AR-003**) supports that pattern: each entry records residual risk, mitigations, rationale, acceptance and **next review** dates, plus **operator summaries** in the same document.

## Trust boundaries (summary)

Understanding where data and credentials move is essential for both CRA technical documentation and ISMS risk analysis:

1. **Browser / Electron** ↔ **Express frontend** ↔ **Backend APIs** (`/api`).
2. **Browser** ↔ **Agent Controller WebSocket** ↔ **Remote agent-manager WebSocket** (`/agents`) using **client-stored** credentials toward the remote host—not the end-user’s controller JWT merged into HTTP proxy headers.
3. **Controller** ↔ **Customer `client.endpoint`** (SSRF and misconfiguration risk; mitigated by allowlists, TLS policy, DNS checks).
4. **Provisioning** ↔ **Cloud APIs and SSH** to new hosts (see **AR-001** in **[Accepted risks](./accepted-risks.md)**).
5. **Agent Manager** ↔ **Docker / containers** (execution and file operations).

Operational control detail: **[Operational hardening](./operational-hardening.md)**.

## Related documentation

- **[Accepted risks](./accepted-risks.md)**
- **[Operational hardening](./operational-hardening.md)**
- **[Vulnerability reporting and artifacts](./vulnerability-reporting-and-artifacts.md)**
- **[Environment configuration](../deployment/environment-configuration.md)**

---

_For regulatory interpretation, consult qualified legal and compliance advisors._
