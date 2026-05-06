# Environment Configuration

Complete reference for all environment variables used in Agenstra.

## Backend Agent Controller

### Application Configuration

- `PORT` - HTTP API port (default: `3100`)
- `WEBSOCKET_PORT` - WebSocket gateway port (default: `8081`)
- `NODE_ENV` - Environment mode (`development` or `production`)

### Database Configuration

- `DB_HOST` - Database host (default: `localhost`)
- `DB_PORT` - Database port (default: `5432`)
- `DB_USERNAME` - Database username (default: `postgres`)
- `DB_PASSWORD` - Database password (default: `postgres`)
- `DB_DATABASE` - Database name (default: `postgres`)

### Authentication

- `AUTHENTICATION_METHOD` - **Required in production**: must be set explicitly to `api-key`, `keycloak`, or `users`. The application **does not** infer production authentication from `STATIC_API_KEY` alone (throws on startup if missing/invalid). Outside production, if unset, behavior may fall back for developer convenience (`STATIC_API_KEY` → api-key, else Keycloak).

**Option 1: API Key Authentication** (`AUTHENTICATION_METHOD=api-key`)

- `STATIC_API_KEY` - Static API key for authentication (required)

**Option 2: Keycloak Authentication** (`AUTHENTICATION_METHOD=keycloak`)

- `KEYCLOAK_SERVER_URL` - Keycloak server URL (optional, used for server URL if different from auth server URL)
- `KEYCLOAK_AUTH_SERVER_URL` - Keycloak authentication server URL (required)
- `KEYCLOAK_REALM` - Keycloak realm name (required)
- `KEYCLOAK_CLIENT_ID` - Keycloak client ID (required)
- `KEYCLOAK_CLIENT_SECRET` - Keycloak client secret (required)
- `KEYCLOAK_TOKEN_VALIDATION` - Token validation method: `ONLINE` or `OFFLINE` (optional, default: `ONLINE`)

**Option 3: Users Authentication** (`AUTHENTICATION_METHOD=users`)

- `JWT_SECRET` - Secret for signing JWT tokens (required)
- `DISABLE_SIGNUP` - When `true`, disables self-registration. The register endpoint returns 503 Service Unavailable. Use admin user creation for onboarding. (default: `false`)

**Note for Backend Agent Manager**: When using Keycloak authentication, the JWT token must include the `agent_management` role to access agent-manager endpoints.

### CORS Configuration

- `CORS_ORIGIN` - Allowed CORS origins (comma-separated list)
  - Production: **Required** - Set to allow specific origins (CORS disabled if not set)
  - Development: Optional - Defaults to `*` (all origins allowed)

### Rate Limiting

- `RATE_LIMIT_ENABLED` - Enable/disable rate limiting (default: `true` in production, `false` in development)
- `RATE_LIMIT_TTL` - Time window in seconds (default: `60`)
- `RATE_LIMIT_LIMIT` - Maximum requests per window (default: `100`)

### Autonomous ticket automation (scheduler)

These variables tune the in-process scheduler that picks up eligible tickets for autonomous prototyping runs (see [Ticket automation](../features/ticket-automation.md)).

- `AUTONOMOUS_TICKET_SCHEDULER_INTERVAL_MS` - Interval between scheduler ticks in milliseconds (default: `60000`)
- `AUTONOMOUS_TICKET_SCHEDULER_BATCH_SIZE` - Maximum tickets processed per tick (default: `5`)

During finalize, the orchestrator may ask the remote agent for a Conventional Commits subject; this call is bounded by:

- `REMOTE_AGENT_COMMIT_MESSAGE_TIMEOUT_MS` - Timeout in milliseconds for that chat round-trip (default: `120000`)

### WebSocket CORS (Agent Controller)

- `WEBSOCKET_CORS_ORIGIN` - Comma-separated allowed browser origins for the controller Socket.IO server (same port as `WEBSOCKET_PORT`, default `8081`). In **production**, if **unset**, allowed origins default to **none** (fail closed). Set to your frontend origin(s), e.g. `https://console.example.com`.

### Remote client endpoints (SSRF guardrails)

These variables apply to **agent-controller** traffic toward customer-configured **`client.endpoint`** values (HTTP proxy and WebSocket to remote agent-managers).

- `CLIENT_ENDPOINT_ALLOWED_HOSTS` - **Mandatory in production**: comma-separated **lowercase hostnames** allowed as `client.endpoint` hosts (e.g. `agent.example.com,customer2.example.org`). If unset in production, the controller **exits** on startup.
- `CLIENT_ENDPOINT_ALLOW_INSECURE_HTTP` - Set to `true` to allow `http:` client endpoints (not recommended for production).
- `CLIENT_ENDPOINT_TLS_REJECT_UNAUTHORIZED` - Defaults to TLS certificate verification. Setting to `false` disables verification (**not allowed** when `NODE_ENV=production`).
- `CLIENT_ENDPOINT_SKIP_DNS_CHECK` - Set to `true` to skip DNS resolution checks that reject private/loopback addresses (**not recommended** except in controlled test environments).

See also: [Operational hardening — Agent Controller](../security/operational-hardening.md#agent-controller--remote-client-endpoints-ssrf).

### Server Provisioning

- `HETZNER_API_TOKEN` - Hetzner Cloud API token (for server provisioning)
- `DIGITALOCEAN_API_TOKEN` - DigitalOcean API token (for server provisioning)
- `ENCRYPTION_KEY` - Encryption key for sensitive data

## Backend Agent Manager

### Application Configuration

- `PORT` - HTTP API port (default: `3000`)
- `WEBSOCKET_PORT` - WebSocket gateway port (default: `8080`)
- `NODE_ENV` - Environment mode (`development` or `production`)

### Database Configuration

- `DB_HOST` - Database host (default: `localhost`)
- `DB_PORT` - Database port (default: `5432`)
- `DB_USERNAME` - Database username (default: `postgres`)
- `DB_PASSWORD` - Database password (default: `postgres`)
- `DB_DATABASE` - Database name (default: `postgres`)

### Authentication

- `AUTHENTICATION_METHOD` - **Required in production**: `api-key`, `keycloak`, or `users` (same explicit rule as agent-controller; no inference from `STATIC_API_KEY` alone in production).

**Option 1: API Key Authentication**

- `STATIC_API_KEY` - Static API key for authentication

**Option 2: Keycloak Authentication**

- `KEYCLOAK_SERVER_URL` - Keycloak server URL (optional, used for server URL if different from auth server URL)
- `KEYCLOAK_AUTH_SERVER_URL` - Keycloak authentication server URL (required)
- `KEYCLOAK_REALM` - Keycloak realm name (required)
- `KEYCLOAK_CLIENT_ID` - Keycloak client ID (required)
- `KEYCLOAK_CLIENT_SECRET` - Keycloak client secret (required)
- `KEYCLOAK_TOKEN_VALIDATION` - Token validation method: `ONLINE` or `OFFLINE` (optional, default: `ONLINE`)

**Note for Backend Agent Manager**: When using Keycloak authentication, the JWT token must include the `agent_management` role to access agent-manager endpoints.

### CORS Configuration

- `CORS_ORIGIN` - Allowed CORS origins (comma-separated list)
  - Production: **Required** - Set to allow specific origins (CORS disabled if not set)
  - Development: Optional - Defaults to `*` (all origins allowed)

### Rate Limiting

- `RATE_LIMIT_ENABLED` - Enable/disable rate limiting (default: `true` in production, `false` in development)
- `RATE_LIMIT_TTL` - Time window in seconds (default: `60`)
- `RATE_LIMIT_LIMIT` - Maximum requests per window (default: `100`)

### Git Repository Configuration

**For HTTPS Repositories:**

- `GIT_REPOSITORY_URL` - Git repository URL (HTTPS)
- `GIT_USERNAME` - Git username
- `GIT_TOKEN` - Git personal access token (preferred)
- `GIT_PASSWORD` - Git password (alternative to token)

**For SSH Repositories:**

- `GIT_REPOSITORY_URL` - Git repository URL (SSH)
- `GIT_PRIVATE_KEY` - SSH private key (PEM or OpenSSH format, no passphrase)

### Cursor Agent Configuration

- `CURSOR_API_KEY` - Cursor API key for agent communication
- `CURSOR_AGENT_DOCKER_IMAGE` - Docker image for cursor-agent containers (default: `ghcr.io/forepath/agenstra-manager-worker:latest`)

### Git Author Configuration

- `GIT_AUTHOR_NAME` - Git commit author name (default: `Agenstra`)
- `GIT_AUTHOR_EMAIL` - Git commit author email (default: `noreply@agenstra.com`)

## Frontend applications (all `frontend-*` Express servers)

The following apply to **`frontend-agent-console`**, **`frontend-billing-console`**, **`frontend-portal`**, and **`frontend-docs`** unless noted.

### Runtime configuration (`GET /config`)

- `CONFIG` - Optional URL to a remote **JSON object** merged at runtime (fetched server-side via `GET /config`).
  - If unset, `/config` returns `{}` and the app uses build-time defaults.
  - **Production** (`NODE_ENV=production`): URL must use **HTTPS** unless `CONFIG_ALLOW_INSECURE_HTTP=true`.
  - When `CONFIG` is set in production, **`CONFIG_ALLOWED_HOSTS`** is **required** (comma-separated hostnames, lowercase).
  - Fetches use a bounded timeout and size; responses must be `application/json` plain objects; redirects are rejected.

**Defense-in-depth (DNS):** hostnames are resolved and must not point to private/loopback ranges unless skipped (see `CONFIG_SKIP_DNS_CHECK`). Literal IPs and dev hosts (`localhost`, `127.0.0.1`, `::1`) follow dedicated rules.

| Variable                     | Purpose                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `CONFIG_ALLOWED_HOSTS`       | **Required** when `CONFIG` is set in production; hostname allowlist.               |
| `CONFIG_ALLOW_INSECURE_HTTP` | Set `true` to allow `http:` URLs (discouraged in production).                      |
| `CONFIG_FETCH_TIMEOUT_MS`    | Fetch timeout in ms (default **10000**).                                           |
| `CONFIG_FETCH_MAX_BYTES`     | Max response body size (default **262144**).                                       |
| `CONFIG_JSON_MAX_DEPTH`      | Max nesting depth for JSON object (guardrail).                                     |
| `CONFIG_JSON_MAX_KEYS`       | Max total keys for JSON object (guardrail).                                        |
| `CONFIG_SKIP_DNS_CHECK`      | Set `true` to skip DNS private/loopback check (**not recommended** in production). |

**Caching:** Successful `/config` responses set `Cache-Control` (e.g. production: `private, max-age=60, stale-while-revalidate=300`); errors use `no-store`.

### Content Security Policy (Express)

- `CSP_ENFORCE` - Set to `true` to send enforcing **`Content-Security-Policy`** instead of **`Content-Security-Policy-Report-Only`**. Default is report-only so violations are visible without breaking Monaco; enable enforcement only after verification.

See accepted risk **[AR-003](../security/accepted-risks.md)** (CSP section).

### API and WebSocket (typical frontend-agent-console / billing-console)

- `API_URL` - Backend API endpoint (default: `http://localhost:3100`)
- `WEBSOCKET_URL` - WebSocket endpoint (default: `http://localhost:8081`)

### Keycloak (when using Keycloak on the frontend)

- `KEYCLOAK_AUTH_SERVER_URL` - Keycloak server URL
- `KEYCLOAK_REALM` - Keycloak realm
- `KEYCLOAK_CLIENT_ID` - Keycloak client ID

### Users auth UX (runtime JSON)

For users auth, remote config may include `authentication: { type: "users", disableSignup: true }` to hide signup when the backend has `DISABLE_SIGNUP=true`.

## Environment-Specific Defaults

### Development

- `NODE_ENV=development`
- `CORS_ORIGIN=*` (all origins allowed)
- `RATE_LIMIT_ENABLED=false` (effectively unlimited)
- `RATE_LIMIT_LIMIT=10000`

### Production

- `NODE_ENV=production`
- `CORS_ORIGIN` - **Required** on backends (must be set, otherwise CORS disabled)
- `RATE_LIMIT_ENABLED=true` (default)
- `RATE_LIMIT_LIMIT=100` (default)
- **Agent Controller:** `CLIENT_ENDPOINT_ALLOWED_HOSTS`, explicit `AUTHENTICATION_METHOD`, `ENCRYPTION_KEY` (where used), and typically `WEBSOCKET_CORS_ORIGIN` set to your frontend origins
- **Frontends:** If using `CONFIG`, set `CONFIG_ALLOWED_HOSTS` and HTTPS URLs; review `CSP_ENFORCE` only after testing

## Related Documentation

- **[Security — Operational hardening](../security/operational-hardening.md)** - How these variables affect behavior
- **[Local Development](./local-development.md)** - Local setup
- **[Docker Deployment](./docker-deployment.md)** - Containerized deployment
- **[Production Checklist](./production-checklist.md)** - Production deployment

---

_For application-specific environment variables, see the [application documentation](../applications/README.md)._
