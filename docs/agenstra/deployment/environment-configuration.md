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

- `AUTHENTICATION_METHOD` - Explicit choice: `api-key`, `keycloak`, or `users`. If not set, inferred from `STATIC_API_KEY` (api-key if set, else keycloak).

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

### Client workspace endpoints (SSRF guardrails)

These variables apply to **stored client workspace URLs** (the agent-manager base URL the controller proxies to). They mirror the semantics of frontend **`CONFIG_*`** runtime-config settings where noted.

- `CLIENT_ENDPOINT_ALLOWED_HOSTS` - Comma-separated lowercase hostnames allowed in client endpoint URLs, or `*` for any host (default: unset in non-production; **required in production** — the process exits on startup if unset when `NODE_ENV=production`).
- `CLIENT_ENDPOINT_ALLOW_INSECURE_HTTP` - Set to `true` to allow `http:` client endpoints when `NODE_ENV=production` (default: HTTPS only in production).
- `CLIENT_ENDPOINT_ALLOW_INTERNAL_HOST` - Set to `true` to allow private/loopback hostnames and literal private IPs in client endpoints, and to **skip DNS rebinding checks** (mirrors `CONFIG_ALLOW_INTERNAL_HOST` for `/config`; neither side uses a dedicated skip-DNS env var). Use only in trusted lab or air-gapped deployments.
- `CLIENT_ENDPOINT_TLS_REJECT_UNAUTHORIZED` - Defaults to TLS certificate verification **on** for outbound HTTPS to client endpoints. Set to `false` **only in non-production** to allow self-signed certificates (disallowed when `NODE_ENV=production`).

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

## Frontend applications (Express SSR)

The Angular apps **frontend-agent-console**, **frontend-billing-console**, **frontend-portal**, and **frontend-docs** use the same Express layer for `GET /config` (runtime JSON proxy) and security headers. The variables below are written with the agent console in mind; they apply to all four apps unless an app-specific doc says otherwise.

### Billing manager (provisioned agent controller)

When the billing manager generates cloud-init for a product that includes the agent-controller frontend container, it sets **`CONFIG_ALLOWED_HOSTS`** to the instance **FQDN** (so production `CONFIG` fetches stay allowlisted) and **`CSP_ENFORCE`** to **`true`** by default. Override the CSP default only if your provisioning pipeline sets `frontend.cspEnforce` in the cloud-init config.

It also sets client workspace SSRF env vars on **`backend-agent-controller`**: **`CLIENT_ENDPOINT_TLS_REJECT_UNAUTHORIZED`** (default **`true`**), **`CLIENT_ENDPOINT_ALLOW_INSECURE_HTTP`** (default **`false`**), and **`CLIENT_ENDPOINT_ALLOWED_HOSTS`** (default **`*`** so tenants may register arbitrary agent-manager hostnames while other SSRF layers still apply). DNS rebinding checks follow runtime rules (on by default); use **`CLIENT_ENDPOINT_ALLOW_INTERNAL_HOST`** in non-provisioned setups when you need the same bypass as **`CONFIG_ALLOW_INTERNAL_HOST`** (billing does not set it by default). Optional **`clientEndpointAllowedHosts`** / **`security.clientEndpointAllowedHosts`** in **`requestedConfig`** **merge** the instance FQDN with listed hosts (FQDN first); a single **`*`** entry keeps allow-all. Optional **`security.clientEndpointAllowInsecureHttp`** and **`security.clientEndpointTlsRejectUnauthorized`** map to the same `CLIENT_ENDPOINT_*` variables.

### Runtime Configuration

- `CONFIG` - URL to a remote JSON configuration file that will be loaded at runtime and merged with build-time defaults (optional)
  - If set, the application will fetch this configuration during initialization via `/config` endpoint
  - The remote configuration takes precedence over build-time defaults
  - If not set or fetch fails, the application falls back to build-time defaults
  - Example: `CONFIG=https://config.example.com/agenstra-config.json`
  - For users auth, include `authentication: { type: "users", disableSignup: true }` to hide the signup link and disable registration when backend has DISABLE_SIGNUP=true

#### Runtime config proxy hardening (`/config`)

When `CONFIG` is set, the frontend server fetches and validates the remote JSON with additional controls (SSRF/DNS rebinding defense, size limits, caching policy). Hostname allowlist parsing and private/loopback detection (including **IPv6** and **IPv4-mapped IPv6** addresses) are implemented in **`@forepath/shared/shared/util-network-address`**, shared with backend **client workspace endpoint** validation (`CLIENT_ENDPOINT_*`).

- `CONFIG_ALLOWED_HOSTS` - Comma-separated hostname allowlist for `CONFIG`
  - Production: **Required** when `CONFIG` is set
  - If unset/empty outside production, **all hosts are allowed** (legacy behavior; not recommended)
  - Set to `*` to allow any host (not recommended)
  - Example: `CONFIG_ALLOWED_HOSTS=config.example.com,config2.example.com`
- `CONFIG_ALLOW_INSECURE_HTTP` - When `true`, allows `http://` `CONFIG` URLs in production (default: `false`)
- `CONFIG_ALLOW_INTERNAL_HOST` - When `true`, allows `CONFIG` targets that use/resolve to private or loopback addresses (default: `false`, not recommended)
- `CONFIG_FETCH_TIMEOUT_MS` - Fetch timeout in milliseconds (default: `10000`, min: `1000`, max: `120000`)
- `CONFIG_FETCH_MAX_BYTES` - Maximum response size in bytes (default: `262144` = 256 KiB, min: `1024`, max: `2097152` = 2 MiB)
- `CONFIG_JSON_MAX_DEPTH` - Maximum JSON traversal depth for key counting (default: `12`, min: `1`, max: `32`)
- `CONFIG_JSON_MAX_KEYS` - Maximum total JSON keys across all objects/arrays up to `CONFIG_JSON_MAX_DEPTH` (default: `512`, min: `1`, max: `10000`)

### Content Security Policy (Express)

- `CSP_ENFORCE` - When `true`, sends enforcing `Content-Security-Policy`. Otherwise sends `Content-Security-Policy-Report-Only` (default).
- **`connect-src` behavior** - The policy always allows `'self'`, `https:`, and `wss:`. Outside production it also allows the `http:` and `ws:` **scheme keywords** (any host on those schemes). In **production**, unencrypted `http` / `ws` endpoints are **not** allowed unless you add their **origins** via `CSP_CONNECT_SRC_EXTRA`.
- `CSP_CONNECT_SRC_EXTRA` - Extra `connect-src` entries: comma- or space-separated full URLs; each is normalized to an **origin** (`http`, `https`, `ws`, and `wss` accepted). **Required in production** for APIs on plain HTTP (for example `http://host.docker.internal:3100`). Example: `CSP_CONNECT_SRC_EXTRA=http://host.docker.internal:3100`

### API Configuration

- `API_URL` - Backend API endpoint (default: `http://localhost:3100`)
- `WEBSOCKET_URL` - WebSocket endpoint (default: `http://localhost:8081`)

### Keycloak Configuration

- `KEYCLOAK_AUTH_SERVER_URL` - Keycloak server URL
- `KEYCLOAK_REALM` - Keycloak realm
- `KEYCLOAK_CLIENT_ID` - Keycloak client ID

## Environment-Specific Defaults

### Development

- `NODE_ENV=development`
- `CORS_ORIGIN=*` (all origins allowed)
- `RATE_LIMIT_ENABLED=false` (effectively unlimited)
- `RATE_LIMIT_LIMIT=10000`

### Production

- `NODE_ENV=production`
- `CORS_ORIGIN` - **Required** (must be set, otherwise CORS disabled)
- `RATE_LIMIT_ENABLED=true` (default)
- `RATE_LIMIT_LIMIT=100` (default)

## Related Documentation

- **[Local Development](./local-development.md)** - Local setup
- **[Docker Deployment](./docker-deployment.md)** - Containerized deployment
- **[Production Checklist](./production-checklist.md)** - Production deployment

---

_For application-specific environment variables, see the [application documentation](../applications/README.md)._
