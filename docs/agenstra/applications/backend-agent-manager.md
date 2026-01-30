# Backend Agent Manager

NestJS backend application for managing and interacting with AI agents through HTTP REST API and WebSocket gateway.

## Purpose

This application provides a complete agent management system by integrating the `@forepath/framework-backend-feature-agent-manager` library. It enables the creation, management, and real-time interaction with AI agents through both synchronous HTTP requests and persistent WebSocket connections.

## Features

This application provides:

- **HTTP REST API** - Full CRUD operations for agent management
- **WebSocket Gateway** - Real-time bidirectional communication with agents
- **Container Integration** - Docker container management for agent execution
- **VNC Browser Access** - Virtual workspace containers with XFCE4 desktop and Chromium browser
- **Secure Authentication** - Keycloak integration for HTTP endpoints and database-backed authentication for WebSocket
- **Database Support** - PostgreSQL with TypeORM for data persistence
- **Auto Migrations** - Automatic database schema migrations on startup
- **Rate Limiting** - Configurable rate limiting on all API endpoints
- **CORS Configuration** - Production-safe CORS defaults
- **Plugin-based Agent Providers** - Support for multiple agent implementations (cursor-agent, etc.)

## Architecture

This application is built using:

- **NestJS** - Progressive Node.js framework
- **TypeORM** - Object-Relational Mapping for database operations
- **Keycloak** - Identity and access management (optional, can use API key)
- **Socket.IO** - WebSocket communication
- **Docker** - Container management for agent execution
- **PostgreSQL** - Database for agent storage

The application integrates the `@forepath/framework-backend-feature-agent-manager` library, which provides the core agent management functionality.

## API Endpoints

All HTTP endpoints are prefixed with `/api` and protected by Keycloak authentication (or API key authentication if `STATIC_API_KEY` is set).

### Agent Management

- `GET /api/agents` - List all agents (supports `limit` and `offset` query parameters)
- `GET /api/agents/:id` - Get a single agent by UUID
- `POST /api/agents` - Create a new agent (returns auto-generated password)
- `POST /api/agents/:id` - Update an existing agent
- `DELETE /api/agents/:id` - Delete an agent

### Configuration

- `GET /api/config` - Get configuration parameters including Git repository URL and available agent types

### File Operations

- `GET /api/agents/:agentId/files` - List directory contents
- `GET /api/agents/:agentId/files/:path` - Read file content
- `POST /api/agents/:agentId/files/:path` - Create file or directory
- `PUT /api/agents/:agentId/files/:path` - Write file content
- `DELETE /api/agents/:agentId/files/:path` - Delete file or directory
- `PATCH /api/agents/:agentId/files/:path` - Move file or directory

### Version Control Operations

- `GET /api/agents/:agentId/vcs/status` - Get git status
- `GET /api/agents/:agentId/vcs/branches` - List all branches
- `GET /api/agents/:agentId/vcs/diff?path={filePath}` - Get file diff
- `POST /api/agents/:agentId/vcs/stage` - Stage files
- `POST /api/agents/:agentId/vcs/unstage` - Unstage files
- `POST /api/agents/:agentId/vcs/commit` - Commit staged changes
- `POST /api/agents/:agentId/vcs/push` - Push changes to remote
- `POST /api/agents/:agentId/vcs/pull` - Pull changes from remote
- `POST /api/agents/:agentId/vcs/fetch` - Fetch changes from remote
- `POST /api/agents/:agentId/vcs/rebase` - Rebase current branch
- `POST /api/agents/:agentId/vcs/branches/:branch/switch` - Switch to a branch
- `POST /api/agents/:agentId/vcs/branches` - Create a new branch
- `DELETE /api/agents/:agentId/vcs/branches/:branch` - Delete a branch
- `POST /api/agents/:agentId/vcs/conflicts/resolve` - Resolve merge conflicts

For complete API endpoint documentation, request/response schemas, and authentication requirements, see the application and API reference docs linked below.

## WebSocket Gateway

The Socket.IO WebSocket gateway is available at `http://localhost:8080/agents` (or configured `WEBSOCKET_PORT`).

### Events

#### Client → Server

- `login` - Authenticate with agent ID (UUID or name) and password
- `chat` - Send chat message (requires authentication)

#### Server → Client

- `loginSuccess` - Emitted on successful authentication
- `loginError` - Emitted on authentication failure
- `chatMessage` - Broadcasted to all connected clients when a chat message is sent
- `error` - Emitted on authorization or processing errors

For complete WebSocket event specifications, authentication flow, and usage examples, see the application and API reference docs linked below.

## Authentication

### HTTP Endpoints

All HTTP endpoints are protected by Keycloak authentication by default. If `STATIC_API_KEY` is set, API key authentication is used instead.

**Keycloak Authentication**:

- Include a valid Keycloak JWT bearer token in the `Authorization` header: `Bearer <keycloak-jwt-token>`
- ⚠️ **Note**: The token must include the `agent_management` role to access agent-manager endpoints

**API Key Authentication**:

- Include the API key in the `Authorization` header: `Bearer <static-api-key>` or `ApiKey <static-api-key>`

### WebSocket Gateway

The WebSocket gateway uses database-backed authentication. Agents authenticate using their UUID or name along with their password.

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

## CORS Configuration

The application implements production-safe CORS defaults to prevent unauthorized cross-origin requests.

### Configuration

CORS is configured via the `CORS_ORIGIN` environment variable:

- **`CORS_ORIGIN`** - Comma-separated list of allowed origins
  - If not set:
    - **Production**: CORS is **disabled** (no origins allowed)
    - **Development**: CORS allows **all origins** (`*`)

## Environment Variables

See the application docs and environment configuration for complete environment variable documentation.

**Application-specific:**

- `PORT` - HTTP API port (default: `3000`)
- `WEBSOCKET_PORT` - WebSocket gateway port (default: `8080`)
- `NODE_ENV` - Environment mode (`development` or `production`)

**Git Repository:**

- `GIT_REPOSITORY_URL` - Git repository URL for agent workspace
- `GIT_USERNAME` - Git username for authentication
- `GIT_TOKEN` - Git personal access token
- `GIT_PASSWORD` - Git password (alternative to token)
- `GIT_PRIVATE_KEY` - SSH private key for SSH repositories

**Cursor Agent:**

- `CURSOR_API_KEY` - Cursor API key for agent communication
- `CURSOR_AGENT_DOCKER_IMAGE` - Docker image for cursor-agent containers

**VNC Browser Access:**

- `VNC_SERVER_DOCKER_IMAGE` - Docker image for VNC containers (default: `ghcr.io/forepath/agenstra-manager-vnc:latest`)
- `VNC_SERVER_PUBLIC_PORTS` - Port range for VNC host port allocation (e.g., `"6080-6180"`)

## Database Setup

The application uses TypeORM and requires a database connection to be configured. See the application docs for database setup requirements and entity schema.

## Docker Deployment

The application includes Dockerfiles for containerized deployment:

```bash
# Build API container
nx docker:api backend-agent-manager

# Build worker container
nx docker:worker backend-agent-manager

# Build VNC container
nx docker:vnc-container-image backend-agent-manager
```

### Running the Container

**Important**: When running the API container, you must mount the Docker socket to enable Docker-in-Docker functionality for agent container management:

```bash
# Run with docker-compose (recommended)
cd apps/backend-agent-manager
docker compose up -d

# Or run directly with Docker socket mount
docker run -v /var/run/docker.sock:/var/run/docker.sock \
  -p 3000:3000 \
  -p 8080:8080 \
  -e CORS_ORIGIN="https://agenstra.com" \
  -e RATE_LIMIT_ENABLED=true \
  -e RATE_LIMIT_LIMIT=100 \
  backend-agent-manager:api
```

The `/var/run/docker.sock` mount is required for the application to manage agent containers. Without this mount, the Docker CLI installed in the container will not be able to communicate with the host Docker daemon.

## Production Deployment Checklist

Before deploying to production, ensure:

- ✅ `NODE_ENV=production` is set
- ✅ `CORS_ORIGIN` is configured with your production domain(s)
- ✅ `RATE_LIMIT_ENABLED=true` (or leave unset, defaults to `true` in production)
- ✅ `RATE_LIMIT_LIMIT` is set to an appropriate value for your use case
- ✅ `STATIC_API_KEY` or Keycloak credentials are configured
- ✅ Database credentials are secure
- ✅ Docker socket is properly mounted for container management

## Related Documentation

- **[Agent Management Feature](../features/agent-management.md)** - Agent management guide
- **[VNC Browser Access Feature](../features/vnc-browser-access.md)** - VNC browser access guide
- **[WebSocket Communication Feature](../features/websocket-communication.md)** - WebSocket communication guide
- **[Deployment Guide](../deployment/production-checklist.md)** - Production deployment guide

## License

This application is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

Copyright (c) 2025 IPvX UG (haftungsbeschränkt)

---

_For detailed technical specifications, see the application and API reference docs linked below._
