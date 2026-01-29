# @agenstra/code

Nx generators for scaffolding applications and libraries in the monorepo. Generators follow the workspace's scope and domain conventions (frontend, backend, native, keycloak-theme, shared) and produce projects that align with the framework guidelines.

## Generators

Run any generator with `nx generate @agenstra/code:GENERATOR_NAME [options]`. All generators are interactive when options are omitted.

### backend

Creates a new NestJS backend application.

- **name** (required) – Application name
- **protected** (default: `true`) – Enable authenticated routes

```bash
nx generate @agenstra/code:backend my-api
nx generate @agenstra/code:backend my-api --protected=false
```

### frontend

Creates a new Angular frontend application.

- **name** (required) – Application name
- **prefix** (default: `app`) – Component/selector prefix
- **ui** (default: `clarity`) – UI stack: `clarity`, `bootstrap`, or `none`
- **protected** (default: `true`) – Enable authenticated routes
- **localization** (default: `true`) – Enable i18n
- **ssr** (default: `true`) – Enable server-side rendering

```bash
nx generate @agenstra/code:frontend portal --prefix=app --ui=clarity
nx generate @agenstra/code:frontend portal --ui=bootstrap --no-ssr
```

### keycloak-theme

Creates a new Keycloakify-based Keycloak theme (Angular).

- **name** (required) – Theme/application name
- **prefix** (default: `app`) – Component prefix

```bash
nx generate @agenstra/code:keycloak-theme my-theme
```

### domain

Creates a new domain with placeholder index files for backend, frontend, keycloak, native, and shared.

- **name** (required) – Domain name
- **prefix** (default: `@domain`) – Import/package prefix

```bash
nx generate @agenstra/code:domain payments --prefix=@domain
```

### lib

Creates a new domain library (feature, data-access, ui, or util) under a given domain and scope.

- **domain** (required) – Domain name
- **scope** (required) – `frontend`, `backend`, `native`, `keycloak`, or `shared`
- **type** (required) – `data-access`, `feature`, `ui`, or `util`
- **name** (required) – Library name
- **generator** (required) – Base Nx generator: `js`, `node`, or `angular`

```bash
nx generate @agenstra/code:lib --domain=payments --scope=frontend --type=feature --name=checkout --generator=angular
```

### native

Creates a new Ionic + Angular device-native application (iOS/Android).

- **name** (required) – Application name
- **prefix** (default: `app`) – Component prefix
- **protected** (default: `true`) – Enable authenticated routes
- **capacitor** (default: `true`) – Add Capacitor for native runtimes

```bash
nx generate @agenstra/code:native mobile-app
nx generate @agenstra/code:native mobile-app --no-capacitor
```

### mcp

Creates a new MCP (Model Context Protocol) server project.

- **name** (required) – Server/project name
- **protected** (default: `true`) – Enable authenticated routes

```bash
nx generate @agenstra/code:mcp my-mcp-server
```

### init

Initializes the repository for use with AI agents (e.g. adds or configures agent-related structure). No options.

```bash
nx generate @agenstra/code:init
```

## Building and testing

- `nx build code` – build the library
- `nx test code` – run unit tests

## Exports

This package exposes **Nx generators only**; there is no programmatic API. Use `nx generate @agenstra/code:...` as shown above.
