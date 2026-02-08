# AGI Support

AGI (Artificial General Intelligence) agents run an OpenClaw gateway in a Docker container, providing a chat-only interface powered by OpenClaw's multi-model support.

## Overview

AGI agents use the [OpenClaw](https://docs.clawd.bot/) gateway to provide conversational AI capabilities. Unlike standard Cursor agents, AGI agents:

- **No workspace setup** – No git clone, VNC, or SSH containers
- **Chat-only UI** – Editor, deployments, and virtual desktop are hidden
- **OpenClaw configuration** – Use the OpenClaw Control UI for model selection and settings
- **Embedded chat** – The OpenClaw WebChat is embedded in an iframe within the Agenstra chat mask

## Creating an AGI Agent

1. Navigate to **Workspaces** and select a client
2. Click **Add Environment** (or **Add Agent**)
3. Choose **agentType: agi**
4. Enter a name and optional description
5. **Git repository URL** is not required for AGI agents
6. **Create Virtual Workspace** and **Create SSH Connection** are skipped for AGI

The agent-manager will:

- Create a single Docker container running the OpenClaw gateway
- Expose the gateway on a random host port (stored as `openclaw_host_port`)
- Start the gateway with `--allow-unconfigured` for headless operation

## Chat Interface

When you select an AGI agent:

- The chat area shows the **embedded OpenClaw WebChat** iframe
- The OpenClaw UI loads via the agent-controller proxy
- Chat messages go directly to the OpenClaw gateway (not the agent-manager WebSocket)

## Configuration

### Configure OpenClaw

Click **Configure OpenClaw** in the chat toolbar to open the OpenClaw Control UI in a new tab. Use it to:

- Select model providers (Anthropic, OpenAI, etc.)
- Configure API keys
- Adjust agent settings

### Environment Variables

Model API keys can be passed to the AGI container at creation time via environment variables such as:

- `ANTHROPIC_API_KEY` – Anthropic Claude
- `OPENAI_API_KEY` – OpenAI GPT models

Alternatively, configure them through the OpenClaw Control UI after the agent is created.

## Architecture

```
Frontend (Chat) → Agent Controller (proxy) → OpenClaw Gateway (port 18789)
                        ↓
                 Agent Manager (creates AGI container)
```

- **Agent Controller** exposes `/api/clients/:id/agents/:agentId/openclaw-url` and `/api/clients/:id/agents/:agentId/openclaw` to proxy traffic to the OpenClaw gateway
- **Agent Manager** runs the AGI container and binds a random host port to container port 18789
- **Frontend** fetches the proxy URL and embeds it in an iframe for the chat UI

## Docker Image

The AGI container uses `Dockerfile.agi` which:

- Base: Node.js 22 (OpenClaw requirement)
- Image: `alpine/openclaw:latest` or custom build
- Exposes port 18789
- Runs with `--allow-unconfigured` for headless startup

Override the image via `AGI_AGENT_DOCKER_IMAGE`.

## Troubleshooting

### OpenClaw not loading

- Ensure the agent-manager can reach the agent-manager host (for port binding)
- Check that the client `endpoint` is correct and points to the agent-manager
- Verify the AGI container is running and the OpenClaw gateway started successfully

### Configuration UI shows "unauthorized"

OpenClaw may require pairing. Run inside the container:

```bash
openclaw dashboard --no-open
```

Then paste the token into the Control UI (Settings → token).

### Chat not responding

- Ensure model API keys are configured (via environment or OpenClaw UI)
- Check OpenClaw logs in the container for errors
