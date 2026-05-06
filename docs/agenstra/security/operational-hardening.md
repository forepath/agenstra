# Operational hardening

This page describes **implemented** security controls that operators and security reviewers should know about. For **environment variable names and defaults**, see **[Environment configuration](../deployment/environment-configuration.md)**.

## Authentication mode (backends)

- In **`NODE_ENV=production`**, **`AUTHENTICATION_METHOD`** must be set **explicitly** to one of: `api-key`, `keycloak`, `users`.
- The application **does not** infer production mode from **`STATIC_API_KEY`** alone (avoids silent misconfiguration).
- Outside production, unset `AUTHENTICATION_METHOD` may still fall back for developer convenience (`STATIC_API_KEY` → api-key, else Keycloak).

Implementation: `libs/domains/identity/backend/util-auth/src/lib/hybrid-auth.guard.ts` (`getAuthenticationMethod`).

## Agent Controller — remote client endpoints (SSRF)

Customer-configured **`client.endpoint`** values drive HTTP and WebSocket traffic from the controller to remote agent-managers.

| Control                                       | Purpose                                                                                                        |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **`CLIENT_ENDPOINT_ALLOWED_HOSTS`**           | Comma-separated hostname allowlist. **Required in production** — the controller **exits** on startup if unset. |
| **`CLIENT_ENDPOINT_ALLOW_INSECURE_HTTP`**     | Set to `true` only if `http:` endpoints must be allowed (discouraged).                                         |
| **`CLIENT_ENDPOINT_TLS_REJECT_UNAUTHORIZED`** | Defaults to TLS verification on. **`false` is forbidden in production.**                                       |
| **`CLIENT_ENDPOINT_SKIP_DNS_CHECK`**          | Skips DNS resolution defense (private/loopback rebinding). Use only in controlled test scenarios.              |

DNS validation resolves the endpoint hostname and rejects addresses in private/loopback space (unless skipped as above). Literal private IPs are rejected by URL validation.

Code: `libs/domains/framework/backend/feature-agent-controller/src/lib/utils/client-endpoint-security.ts`.

## HTTP proxy to remote agent-manager — headers

Outbound proxied HTTP requests **drop** caller-supplied credential-like headers (`Authorization`, cookies, `x-api-key`, etc.) and attach only the **service-computed** `Authorization` for the **client entity** (stored API key or token). This prevents accidental forwarding of the **portal user’s** JWT on HTTP proxy paths.

Code: `libs/domains/framework/backend/feature-agent-controller/src/lib/utils/client-proxy-request-headers.ts` (used by `ClientAgentProxyService` and related `client-*-proxy` services).

WebSocket connections to `/agents` use **`getAuthHeader(clientId)`** from the same client credentials—not the browser handshake token alone.

## Logging and correlation

- **Correlation ID middleware** runs **first** on all three backends: accepts or generates `X-Correlation-Id` / `X-Request-Id`, binds AsyncLocalStorage, sets response header, logs one **access line per request** with **path only** (no query string) and **`redactSecretsInString`** (Bearer, Basic, ApiKey-style fragments, email patterns).
- **`CorrelationAwareConsoleLogger`** adds `[corr=…]` (text) or `correlationId` (JSON) to Nest framework logs inside the request async context.

Code: `libs/domains/framework/backend/util-http-context/`.

Structured error payloads logged from agent-controller proxies may pass through **`redactSensitive`** (sensitive key names, JWT-shaped strings, `Bearer` / `Basic` prefixes): `libs/domains/framework/backend/feature-agent-controller/src/lib/utils/redact-sensitive.ts`.

## Frontend runtime configuration (`GET /config`)

When **`CONFIG`** points to a remote JSON URL, Express servers validate fetches using **`@forepath/framework/frontend/util-runtime-config-server`**:

- Production: **HTTPS** unless **`CONFIG_ALLOW_INSECURE_HTTP=true`**; **`CONFIG_ALLOWED_HOSTS`** required when `CONFIG` is set.
- Timeout, max bytes, JSON object shape, content-type, redirect blocking, optional key count/depth limits.
- DNS check against private/loopback resolution (skippable via **`CONFIG_SKIP_DNS_CHECK`** in exceptional cases).
- Response **`Cache-Control`**: e.g. `private, max-age=60, stale-while-revalidate=300` in production on success; `no-store` on proxy errors.

See **[Environment configuration — Frontend (all `frontend-*` apps)](../deployment/environment-configuration.md)** for variable names.

## Content Security Policy (frontend Express)

- CSP includes **`'unsafe-inline'`** and **`'unsafe-eval'`** for Monaco and tooling; default delivery is **`Content-Security-Policy-Report-Only`**.
- Set **`CSP_ENFORCE=true`** only after verifying the application still works.

Accepted risk: **[AR-003](./accepted-risks.md)** (CSP section).

## WebSocket CORS (Agent Controller)

- **`WEBSOCKET_CORS_ORIGIN`**: comma-separated allowed origins for the Socket.IO server.
- In **production**, if unset, the allowed origin list is **empty** (fail closed). Set explicitly to your frontend origins.

## Origin allowlist (unsafe HTTP methods)

Browser-originated **state-changing** requests can be restricted by origin allowlist middleware on backends (see `origin-allowlist.middleware.ts` in identity util-auth). Configure per deployment expectations.

## Related documentation

- **[Accepted risks](./accepted-risks.md)** — AR-001–AR-003
- **[Environment configuration](../deployment/environment-configuration.md)**
- **[Production checklist](../deployment/production-checklist.md)**
- **[Backend Agent Controller application](../applications/backend-agent-controller.md)** — WebSocket and ports

---

_For provisioning SSH, desktop integrity, and CSP operator summaries, see **[Accepted risks](./accepted-risks.md)** and **[Vulnerability reporting and artifacts](./vulnerability-reporting-and-artifacts.md)**._
