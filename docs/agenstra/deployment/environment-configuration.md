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

⚠️ **Note for Backend Agent Manager**: When using Keycloak authentication, the JWT token must include the `agent_management` role to access agent-manager endpoints.

### CORS Configuration

- `CORS_ORIGIN` - Allowed CORS origins (comma-separated list)
  - Production: **Required** - Set to allow specific origins (CORS disabled if not set)
  - Development: Optional - Defaults to `*` (all origins allowed)

### Rate Limiting

- `RATE_LIMIT_ENABLED` - Enable/disable rate limiting (default: `true` in production, `false` in development)
- `RATE_LIMIT_TTL` - Time window in seconds (default: `60`)
- `RATE_LIMIT_LIMIT` - Maximum requests per window (default: `100`)

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

⚠️ **Note for Backend Agent Manager**: When using Keycloak authentication, the JWT token must include the `agent_management` role to access agent-manager endpoints.

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

## Frontend Agent Console

### Runtime Configuration

- `CONFIG` - URL to a remote JSON configuration file that will be loaded at runtime and merged with build-time defaults (optional)
  - If set, the application will fetch this configuration during initialization via `/config` endpoint
  - The remote configuration takes precedence over build-time defaults
  - If not set or fetch fails, the application falls back to build-time defaults
  - Example: `CONFIG=https://config.example.com/agenstra-config.json`
  - For users auth, include `authentication: { type: "users", disableSignup: true }` to hide the signup link and disable registration when backend has DISABLE_SIGNUP=true

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
