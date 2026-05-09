import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import {
  type FetchRuntimeConfigEnv,
  applyRuntimeConfigResponseCacheHeaders,
  fetchRuntimeConfigFromEnv,
} from '@forepath/framework/frontend/util-runtime-config-server';
import express from 'express';

import bootstrap from './main.server';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');
const app = express();
const commonEngine = new CommonEngine();

function parseCspConnectSrcExtra(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }

  const tokens = raw
    .split(/[\s,]+/g)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const origins: string[] = [];

  for (const token of tokens) {
    try {
      const url = new URL(token);

      if (url.protocol !== 'http:' && url.protocol !== 'https:' && url.protocol !== 'ws:' && url.protocol !== 'wss:') {
        continue;
      }

      origins.push(url.origin);
    } catch {
      // Ignore invalid entries
    }
  }

  return origins;
}

function applySecurityHeaders() {
  const enforceCsp = process.env['CSP_ENFORCE']?.trim().toLowerCase() === 'true';
  const cspHeader = enforceCsp ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only';
  const unencryptedProtocols = ['http:', 'ws:'];
  const connectSrcExtra = parseCspConnectSrcExtra(process.env['CSP_CONNECT_SRC_EXTRA']);
  const connectSrc = [
    "'self'",
    'https:',
    'wss:',
    ...(process.env['NODE_ENV'] === 'production' ? [] : unencryptedProtocols),
    ...connectSrcExtra,
  ].join(' ');
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
  ].join('; ');

  app.use((_, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader(cspHeader, csp);

    if (process.env['NODE_ENV'] === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    }

    next();
  });
}

applySecurityHeaders();

/**
 * Runtime configuration endpoint.
 * If process.env.CONFIG is set to a URL, this endpoint will proxy the JSON from that URL
 * (allowlist, HTTPS, timeout, size, and JSON shape enforced — see util-runtime-config-server).
 * Otherwise, it returns an empty object so the frontend can safely fall back to defaults.
 */
app.get('/config', async (_req, res) => {
  const env = process.env as FetchRuntimeConfigEnv;
  const result = await fetchRuntimeConfigFromEnv(env);

  if (result.kind === 'no_config') {
    applyRuntimeConfigResponseCacheHeaders(res, 'success', env);

    return res.json({});
  }

  if (result.kind === 'error') {
    console.error(result.log);
    applyRuntimeConfigResponseCacheHeaders(res, 'error', env);

    return res.status(result.statusCode).json({});
  }

  applyRuntimeConfigResponseCacheHeaders(res, 'success', env);

  return res.json(result.value);
});

/**
 * Serve static files from /browser
 */
app.get(
  '**',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html',
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.get('**', (req, res, next) => {
  const { protocol, originalUrl, baseUrl, headers } = req;

  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    })
    .then((html) => res.send(html))
    .catch((err) => next(err));
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = parseInt(process.env['PORT'] || '4000', 10);

  app.listen(port, '0.0.0.0', () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export default app;
