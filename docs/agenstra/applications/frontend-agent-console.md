# Frontend Agent Console

Angular web application providing a web-based IDE and chat interface for interacting with AI agents.

## Purpose

This application provides a comprehensive user interface for managing clients, agents, and interacting with AI agents in real-time. It includes a Monaco Editor-based code editor, chat interface, file management, and Git operations.

## Features

This application provides:

- **Chat Interface** - Real-time bidirectional communication with AI agents via WebSocket
- **Monaco Editor** - Integrated code editor with syntax highlighting and code completion
- **File Management** - Browse, read, write, create, and delete files in agent containers
- **Version Control** - Full Git operations (status, branches, commit, push, pull, rebase)
- **Container Statistics** - Real-time container resource monitoring (CPU, memory, network)
- **Client Management** - Create, update, and delete clients (remote agent-manager instances)
- **Agent Management** - Create, update, and delete agents
- **Server Provisioning** - Provision cloud servers (Hetzner, DigitalOcean) with automated deployment
- **State Management** - NgRx for predictable state management
- **Authentication** - Keycloak-based authentication with automatic token refresh

## Architecture

This application is built using:

- **Angular** - Frontend framework
- **NgRx** - State management (Actions, Reducers, Effects, Selectors, Facades)
- **Monaco Editor** - Code editor (VS Code editor in the browser)
- **Socket.IO Client** - WebSocket communication
- **Bootstrap** - UI framework
- **RxJS** - Reactive programming

The application integrates:

- `@forepath/framework/frontend/feature-agent-console` - Feature components
- `@forepath/framework/frontend/data-access-agent-console` - State management and data access

## State Management (NgRx)

The application uses NgRx for state management with the following state slices:

### Clients State

- Client list and selected client
- Client loading states
- Client operations (create, update, delete)

### Agents State

- Agent list and selected agent
- Agent loading states
- Agent operations (create, update, delete)

### Sockets State

- WebSocket connection status
- Client context
- Forwarded events (chat messages, etc.)
- Reconnection handling

### Files State

- File system tree
- Current file content
- File operations (read, write, create, delete, move)

### VCS State

- Git status
- Branches list
- File diffs
- VCS operations (stage, commit, push, pull)

### Authentication State

- Authentication status
- User information
- Token management

### Stats State

- Container statistics (CPU, memory, network)
- Real-time updates

## Routing

The application uses Angular routing with the following structure:

- `/login` - Login page
- `/clients` - Client list and management
- `/clients/:clientId` - Agent list for a client
- `/clients/:clientId/agents/:agentId` - Chat interface for an agent
- `/clients/:clientId/agents/:agentId/editor` - Code editor for an agent

## Components

### AgentConsoleContainerComponent

Main container component that provides the layout and routing structure.

### AgentConsoleLoginComponent

Login page with Keycloak authentication integration.

### AgentConsoleChatComponent

Main chat interface component that includes:

- Chat message display
- Message input
- File editor integration
- Container statistics
- Client and agent management modals

### FileEditorComponent

Monaco Editor integration for code editing with:

- Syntax highlighting
- Code completion
- File system browser
- Save functionality

## WebSocket Communication

The application connects to the agent-controller WebSocket gateway and:

1. Sets client context using `setClient` event
2. Forwards events to remote agent-managers using `forward` event
3. Receives forwarded events from agent-managers
4. Handles reconnection and state restoration

### Reconnection Handling

On reconnection:

1. Automatically reconnects to the WebSocket
2. Restores client context
3. Restores agent login (if previously logged in)
4. Clears old events to prevent duplicates
5. Receives chat history from the backend

## Authentication

The application uses Keycloak for authentication:

1. User is redirected to Keycloak login page
2. After successful login, user is redirected back with authorization code
3. Application exchanges code for access token
4. Token is stored and included in HTTP requests
5. Token is automatically refreshed before expiration

## Environment Configuration

Configure the application via environment variables:

### Runtime Configuration (Docker Containers)

- `CONFIG` - URL to a remote JSON configuration file that will be loaded at runtime and merged with build-time defaults (optional)
  - If set, the application will fetch this configuration during initialization via `/config` endpoint
  - The remote configuration takes precedence over build-time defaults
  - If not set or fetch fails, the application falls back to build-time defaults
  - Example: `CONFIG=https://config.example.com/agenstra-config.json`
  - For users auth with signup disabled, include `authentication: { type: "users", disableSignup: true }` to hide the "Create an account" link and redirect direct /register navigation to login

### API Configuration

- `API_URL` - Backend API endpoint (default: `http://localhost:3100`)
- `WEBSOCKET_URL` - WebSocket endpoint (default: `http://localhost:8081`)

### Keycloak Configuration

- `KEYCLOAK_AUTH_SERVER_URL` - Keycloak server URL
- `KEYCLOAK_REALM` - Keycloak realm
- `KEYCLOAK_CLIENT_ID` - Keycloak client ID

## Development

### Running Locally

```bash
# Serve the application
nx serve frontend-agent-console

# Build for production
nx build frontend-agent-console

# Run tests
nx test frontend-agent-console
```

### Docker Deployment

```bash
# Build container
nx docker:server frontend-agent-console

# Run with docker-compose
cd apps/frontend-agent-console
docker compose up -d
```

## Production Deployment

Before deploying to production:

1. Configure environment variables
2. Set `API_URL` to production backend endpoint
3. Set `WEBSOCKET_URL` to production WebSocket endpoint
4. Configure Keycloak client for production domain
5. (Optional) Set `CONFIG` environment variable to a remote JSON configuration URL for runtime configuration
6. Build the application: `nx build frontend-agent-console --configuration=production`
7. Serve the built files using a web server (nginx, Apache, etc.)

## Related Documentation

- **[Chat Interface Feature](../features/chat-interface.md)** - Chat functionality guide
- **[Web IDE Feature](../features/web-ide.md)** - Code editor guide
- **[File Management Feature](../features/file-management.md)** - File operations guide
- **[Version Control Feature](../features/version-control.md)** - Git operations guide

---

_For detailed component documentation, see the feature and deployment docs linked above._
