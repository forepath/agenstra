export interface CloudInitConfig {
  backendEnv?: Record<string, string>;
  frontendEnv?: Record<string, string>;
  authenticationMethod?: string;
}

export function buildBillingCloudInitUserData(config: CloudInitConfig): string {
  const backendEnv = formatEnv(config.backendEnv ?? {}, [
    'HOST=0.0.0.0',
    'PORT=3100',
    'WEBSOCKET_PORT=8081',
    'NODE_ENV=production',
    'DB_HOST=postgres',
    'DB_PORT=5432',
    'DB_USERNAME=postgres',
    'DB_PASSWORD=postgres',
    'DB_DATABASE=postgres',
    `AUTHENTICATION_METHOD=${config.authenticationMethod ?? 'api-key'}`,
  ]);

  const frontendEnv = formatEnv(config.frontendEnv ?? {}, [
    'HOST=0.0.0.0',
    'PORT=4200',
    'NODE_ENV=production',
    'DEFAULT_LOCALE=en',
  ]);

  const compose = `services:\n  postgres:\n    image: postgres:16-alpine\n    container_name: agent-controller-postgres\n    environment:\n      POSTGRES_USER: postgres\n      POSTGRES_PASSWORD: postgres\n      POSTGRES_DB: postgres\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n    healthcheck:\n      test: ['CMD-SHELL', 'pg_isready -U postgres']\n      interval: 10s\n      timeout: 5s\n      retries: 5\n    networks:\n      - agent-controller-network\n    restart: unless-stopped\n\n  backend-agent-controller:\n    image: ghcr.io/forepath/agenstra-controller-api:latest\n    container_name: agent-controller-api\n    environment:\n${backendEnv}\n    ports:\n      - '3100:3100'\n      - '8081:8081'\n    depends_on:\n      postgres:\n        condition: service_healthy\n    networks:\n      - agent-controller-network\n    restart: unless-stopped\n\n  frontend-agent-console-server:\n    image: ghcr.io/forepath/agenstra-console-server:latest\n    container_name: agent-console-server\n    environment:\n${frontendEnv}\n    ports:\n      - '4200:4200'\n    networks:\n      - agent-controller-network\n    restart: unless-stopped\n\nvolumes:\n  postgres_data:\n\nnetworks:\n  agent-controller-network:\n    driver: bridge\n`;

  const script = `#!/bin/bash\nset -euo pipefail\n\napt-get update -qq\napt-get install -y ca-certificates curl\ncurl -fsSL https://get.docker.com -o get-docker.sh\nsh ./get-docker.sh\nrm -f get-docker.sh\nsystemctl enable docker\nsystemctl start docker\n\nmkdir -p /opt/agent-stack\ncat > /opt/agent-stack/docker-compose.yaml <<'EOF'\n${compose}\nEOF\n\ncd /opt/agent-stack\ndocker compose up -d\n`;

  return Buffer.from(script).toString('base64');
}

function formatEnv(additional: Record<string, string>, defaults: string[]): string {
  const lines = [...defaults];
  for (const [key, value] of Object.entries(additional)) {
    if (!key || value === undefined) {
      continue;
    }
    lines.push(`${key}=${value}`);
  }
  return lines.map((line) => `      ${line}`).join('\n');
}
