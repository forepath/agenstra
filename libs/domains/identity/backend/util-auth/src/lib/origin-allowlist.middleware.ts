import { ForbiddenException, Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

function parseCorsOriginAllowlist(): string[] {
  const raw = process.env.CORS_ORIGIN;

  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function isUnsafeMethod(method: string | undefined): boolean {
  const m = String(method || '').toUpperCase();

  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
}

/**
 * Defense-in-depth for bearer-token APIs: reject browser-originated mutation requests from unexpected origins.
 *
 * Notes:
 * - Only checks when the browser sends an `Origin` header (non-browser clients often do not).
 * - Only applies to unsafe methods; OPTIONS is ignored.
 * - Allowlist is derived from `CORS_ORIGIN`.
 */
export function createOriginAllowlistMiddleware(
  logger: Logger,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, _res, next) => {
    if (!isUnsafeMethod(req.method)) {
      next();

      return;
    }

    const originHeader = req.headers.origin;

    if (!originHeader) {
      next();

      return;
    }

    const allowlist = parseCorsOriginAllowlist();

    if (allowlist.length === 0) {
      logger.warn(`Rejecting request with Origin=${originHeader} because CORS_ORIGIN is not configured`);
      next(new ForbiddenException('Origin not allowed'));

      return;
    }

    if (allowlist.includes(originHeader)) {
      next();

      return;
    }

    logger.warn(`Rejecting request with Origin=${originHeader} (not in allowlist)`);
    next(new ForbiddenException('Origin not allowed'));
  };
}
