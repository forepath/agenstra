# Security Documentation

This section brings together **security, compliance, and hardening** guidance for Agenstra: **EU CRA** and **BSI IT‑Grundschutz–oriented** context, a formal **risk register**, **vulnerability reporting**, **SBOM** and **desktop integrity** artifacts, and pointers to **environment variables** for production.

## Overview

Agenstra spans browsers, multiple NestJS backends, Express frontends, optional Electron distribution, and customer-controlled remote endpoints. Security is enforced through explicit authentication modes, SSRF guardrails, sanitized logging, content security policy choices, and documented residual risks where product constraints apply.

## Documentation Structure

### [Compliance and standards](./compliance-and-standards.md)

How Agenstra maps to **EU Cyber Resilience Act (CRA)** expectations and **BSI IT‑Grundschutz / ISMS** themes: security by design, logging, supply chain, and documented risk treatment.

### [Accepted risks (register)](./accepted-risks.md)

Formal register **AR-001** through **AR-003**: provisioning SSH posture, native desktop signing/update posture, and frontend CSP for Monaco. Includes acceptance dates, review cadence, and operator summaries.

### [Operational hardening](./operational-hardening.md)

Concrete controls: correlation IDs and access logs, client endpoint allowlists and DNS checks, runtime `/config` proxy behavior, HTTP proxy header stripping, CSP and `CSP_ENFORCE`, WebSocket CORS, and authentication mode rules in production.

### [Vulnerability reporting and artifacts](./vulnerability-reporting-and-artifacts.md)

Responsible disclosure (contact, process), CycloneDX **SBOM** location, and **desktop release integrity** (`SHA256SUMS`, `integrity-manifest.json`).

## Configuration reference

For variable-by-variable deployment settings—including **`CLIENT_ENDPOINT_*`**, **`CONFIG_*`**, **`CSP_ENFORCE`**, and production **`AUTHENTICATION_METHOD`** rules—see **[Environment configuration](../deployment/environment-configuration.md)** and **[Production checklist](../deployment/production-checklist.md)**.

## Related documentation

- **[Architecture](../architecture/README.md)** — Trust boundaries and component roles
- **[Authentication feature](../features/authentication.md)** — User-facing auth flows
- **[Deployment](../deployment/README.md)** — Docker and production guides

---

_Maintained security narrative for operators lives in this folder. A separate repository root **`SECURITY.md`** may duplicate reporting contacts for visitors browsing the repo on GitHub._
