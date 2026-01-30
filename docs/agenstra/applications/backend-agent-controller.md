# Backend Agent Controller

NestJS backend application for managing clients and proxying agent operations to remote agent-manager services.

## Purpose

This application provides a centralized control plane for managing multiple distributed agent-manager instances. It enables the creation, management, and real-time interaction with agents across multiple remote agent-manager services through both synchronous HTTP requests and persistent WebSocket connections.

## Features

This application provides:

- **HTTP REST API** - Full CRUD operations for client management and proxied agent operations
- **WebSocket Gateway** - Real-time bidirectional event forwarding to remote agent-manager services
- **Server Provisioning** - Automated cloud server provisioning (Hetzner Cloud, DigitalOcean) with Docker and agent-manager deployment
- **Secure Authentication** - Keycloak integration for HTTP endpoints and API key fallback
- **Database Support** - PostgreSQL with TypeORM for data persistence
- **Auto Migrations** - Automatic database schema migrations on startup
- **Rate Limiting** - Configurable rate limiting on all API endpoints
- **CORS Configuration** - Production-safe CORS defaults

## Architecture

This application is built using:

- **NestJS** - Progressive Node.js framework
- **TypeORM** - Object-Relational Mapping for database operations
- **Keycloak** - Identity and access management (optional, can use API key)
- **Socket.IO** - WebSocket communication
- **PostgreSQL** - Database for client and credential storage

The application integrates the `@forepath/framework-backend-feature-agent-controller` library, which provides the core client management functionality.

## API Endpoints

All HTTP endpoints are prefixed with `/api` and protected by Keycloak authentication (or API key authentication if `STATIC_API_KEY` is set).

### Client Management

- `GET /api/clients` - List all clients (supports `limit` and `offset` query parameters)
- `GET /api/clients/:id` - Get a single client by UUID
- `POST /api/clients` - Create a new client (returns API key if API_KEY authentication type)
- `POST /api/clients/:id` - Update an existing client
- `DELETE /api/clients/:id` - Delete a client

### Proxied Agent Operations

- `GET /api/clients/:id/agents` - List all agents for a client
- `GET /api/clients/:id/agents/:agentId` - Get a single agent by UUID
- `POST /api/clients/:id/agents` - Create a new agent for a client (returns auto-generated password, saves credentials)
- `POST /api/clients/:id/agents/:agentId` - Update an existing agent
- `DELETE /api/clients/:id/agents/:agentId` - Delete an agent (also deletes stored credentials)

### Proxied File Operations

- `GET /api/clients/:id/agents/:agentId/files` - List directory contents
- `GET /api/clients/:id/agents/:agentId/files/:path` - Read file content
- `POST /api/clients/:id/agents/:agentId/files/:path` - Create file or directory
- `PUT /api/clients/:id/agents/:agentId/files/:path` - Write file content
- `DELETE /api/clients/:id/agents/:agentId/files/:path` - Delete file or directory
- `PATCH /api/clients/:id/agents/:agentId/files/:path` - Move file or directory

### Proxied VCS Operations

- `GET /api/clients/:id/agents/:agentId/vcs/status` - Get git status
- `GET /api/clients/:id/agents/:agentId/vcs/branches` - List all branches
- `GET /api/clients/:id/agents/:agentId/vcs/diff?path={filePath}` - Get file diff
- `POST /api/clients/:id/agents/:agentId/vcs/stage` - Stage files
- `POST /api/clients/:id/agents/:agentId/vcs/unstage` - Unstage files
- `POST /api/clients/:id/agents/:agentId/vcs/commit` - Commit staged changes
- `POST /api/clients/:id/agents/:agentId/vcs/push` - Push changes to remote
- `POST /api/clients/:id/agents/:agentId/vcs/pull` - Pull changes from remote
- `POST /api/clients/:id/agents/:agentId/vcs/fetch` - Fetch changes from remote
- `POST /api/clients/:id/agents/:agentId/vcs/rebase` - Rebase current branch
- `POST /api/clients/:id/agents/:agentId/vcs/branches/:branch/switch` - Switch to a branch
- `POST /api/clients/:id/agents/:agentId/vcs/branches` - Create a new branch
- `DELETE /api/clients/:id/agents/:agentId/vcs/branches/:branch` - Delete a branch
- `POST /api/clients/:id/agents/:agentId/vcs/conflicts/resolve` - Resolve merge conflicts

### Server Provisioning

- `GET /api/clients/provisioning/providers` - List available provisioning providers
- `GET /api/clients/provisioning/providers/:providerType/server-types` - Get available server types for a provider
- `POST /api/clients/provisioning/provision` - Provision a new server and create a client
- `GET /api/clients/:id/provisioning/info` - Get server information for a provisioned client
- `DELETE /api/clients/:id/provisioning` - Delete a provisioned server and its associated client

For complete API endpoint documentation, request/response schemas, and authentication requirements, see the application and API reference docs linked below.

## WebSocket Gateway

The Socket.IO WebSocket gateway is available at `http://localhost:8081/clients` (or configured `WEBSOCKET_PORT`).

### Events

#### Client → Server

- `setClient` - Set the client context for subsequent operations
- `forward` - Forward an event to the remote agent-manager WebSocket

#### Server → Client

- `clientSet` - Confirmation that client context was set
- `forwardedEvent` - Events forwarded from the remote agent-manager
- `error` - Error messages

For complete WebSocket event specifications, authentication flow, and usage examples, see the application and API reference docs linked below.

## Authentication

### HTTP Endpoints

All HTTP endpoints are protected by Keycloak authentication by default. If `STATIC_API_KEY` is set, API key authentication is used instead (no Keycloak fallback).

**Keycloak Authentication**:

- Include a valid Keycloak JWT bearer token in the `Authorization` header: `Bearer <keycloak-jwt-token>`

**API Key Authentication**:

- Include the API key in the `Authorization` header: `Bearer <static-api-key>` or `ApiKey <static-api-key>`

### WebSocket Gateway

The WebSocket gateway uses client context management. Clients must first set their context using the `setClient` event before forwarding events.

For detailed authentication requirements, see the application and API reference docs linked below.

## Rate Limiting

The application implements configurable rate limiting on all API endpoints to prevent abuse and protect against DoS attacks.

### Configuration

Rate limiting is configured via environment variables:

- **`RATE_LIMIT_ENABLED`** - Enable/disable rate limiting
  - Default: `true` in production, `false` in development
- **`RATE_LIMIT_TTL`** - Time window in seconds (default: `60`)
- **`RATE_LIMIT_LIMIT`** - Maximum number of requests per window (default: `100`)

### Behavior

- **Production**: Rate limiting is **enabled by default** (100 requests per 60 seconds)
- **Development**: Rate limiting is **disabled by default** (allows up to 10,000 requests per window)

### Error Response

When rate limit is exceeded, the API returns:

- **Status Code**: `429 Too Many Requests`
- **Message**: `"Too many requests, please try again later."`

## CORS Configuration

The application implements production-safe CORS defaults to prevent unauthorized cross-origin requests.

### Configuration

CORS is configured via the `CORS_ORIGIN` environment variable:

- **`CORS_ORIGIN`** - Comma-separated list of allowed origins
  - Example: `"https://agenstra.com,https://app.agenstra.com"`
  - If not set:
    - **Production**: CORS is **disabled** (no origins allowed) - most secure default
    - **Development**: CORS allows **all origins** (`*`) - convenient for local development

### Behavior

- **Production**: CORS is **disabled by default** (empty origins array)
  - ⚠️ **Warning**: If `CORS_ORIGIN` is not set in production, the application will log a warning and CORS will be disabled
  - **Required**: Set `CORS_ORIGIN` to allow specific origins in production

- **Development**: CORS allows **all origins** (`*`) by default

## Environment Variables

See the application docs and environment configuration for complete environment variable documentation.

**Application-specific:**

- `PORT` - HTTP API port (default: `3100`)
- `WEBSOCKET_PORT` - WebSocket gateway port (default: `8081`)
- `NODE_ENV` - Environment mode (`development` or `production`)

**CORS Configuration:**

- `CORS_ORIGIN` - Allowed CORS origins (comma-separated list)

**Rate Limiting:**

- `RATE_LIMIT_ENABLED` - Enable/disable rate limiting
- `RATE_LIMIT_TTL` - Time window in seconds (default: `60`)
- `RATE_LIMIT_LIMIT` - Maximum requests per window (default: `100`)

**Authentication:**

- `STATIC_API_KEY` - Static API key for authentication (if set, uses API key auth instead of Keycloak)
- `KEYCLOAK_SERVER_URL` - Keycloak server URL (optional, used for server URL if different from auth server URL)
- `KEYCLOAK_AUTH_SERVER_URL` - Keycloak authentication server URL (required for Keycloak auth)
- `KEYCLOAK_REALM` - Keycloak realm name (required for Keycloak auth)
- `KEYCLOAK_CLIENT_ID` - Keycloak client ID (required for Keycloak auth)
- `KEYCLOAK_CLIENT_SECRET` - Keycloak client secret (required for Keycloak auth)
- `KEYCLOAK_TOKEN_VALIDATION` - Token validation method: `ONLINE` or `OFFLINE` (optional, default: `ONLINE`)

**Database:**

- `DB_HOST` - Database host (default: `localhost`)
- `DB_PORT` - Database port (default: `5432`)
- `DB_USERNAME` - Database username (default: `postgres`)
- `DB_PASSWORD` - Database password (default: `postgres`)
- `DB_DATABASE` - Database name (default: `postgres`)

**Server Provisioning:**

- `HETZNER_API_TOKEN` - Hetzner Cloud API token
- `DIGITALOCEAN_API_TOKEN` - DigitalOcean API token
- `ENCRYPTION_KEY` - Encryption key for sensitive data

## Database Setup

The application uses TypeORM and requires a database connection to be configured. See the application docs for database setup requirements and entity schema.

## Docker Deployment

The application includes Dockerfiles for containerized deployment:

```bash
# Build API container
nx docker:api backend-agent-controller
```

### Running the Container

```bash
# Run with docker-compose (recommended)
cd apps/backend-agent-controller
docker compose up -d

# Or run directly
docker run \
  -p 3100:3100 \
  -p 8081:8081 \
  -e CORS_ORIGIN="https://agenstra.com" \
  -e RATE_LIMIT_ENABLED=true \
  -e RATE_LIMIT_LIMIT=100 \
  backend-agent-controller:api
```

## Production Deployment Checklist

Before deploying to production, ensure:

- ✅ `NODE_ENV=production` is set
- ✅ `CORS_ORIGIN` is configured with your production domain(s)
- ✅ `RATE_LIMIT_ENABLED=true` (or leave unset, defaults to `true` in production)
- ✅ `RATE_LIMIT_LIMIT` is set to an appropriate value for your use case
- ✅ `STATIC_API_KEY` or Keycloak credentials are configured
- ✅ Database credentials are secure
- ✅ `ENCRYPTION_KEY` is set for sensitive data encryption

## Related Documentation

- **[Client Management Feature](../features/client-management.md)** - Client management guide
- **[Server Provisioning Feature](../features/server-provisioning.md)** - Server provisioning guide
- **[WebSocket Communication Feature](../features/websocket-communication.md)** - WebSocket communication guide
- **[Deployment Guide](../deployment/production-checklist.md)** - Production deployment guide

## License

This application is licensed under the **Business Source License 1.1 (BUSL-1.1)**.

Copyright (c) 2025 IPvX UG (haftungsbeschränkt)

---

_For detailed technical specifications, see the application and API reference docs linked below._
