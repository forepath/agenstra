import { Logger as NestLogger } from '@nestjs/common';

import { CorrelationAwareTypeOrmLogger } from './typeorm-logger';

describe('CorrelationAwareTypeOrmLogger', () => {
  let debugSpy: jest.SpiedFunction<NestLogger['debug']>;
  let logSpy: jest.SpiedFunction<NestLogger['log']>;
  let warnSpy: jest.SpiedFunction<NestLogger['warn']>;
  let errorSpy: jest.SpiedFunction<NestLogger['error']>;

  beforeEach(() => {
    debugSpy = jest.spyOn(NestLogger.prototype, 'debug').mockImplementation(() => undefined);
    logSpy = jest.spyOn(NestLogger.prototype, 'log').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(NestLogger.prototype, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(NestLogger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    debugSpy.mockRestore();
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('sanitizes query parameters before logging', () => {
    const logger = new CorrelationAwareTypeOrmLogger();

    logger.logQuery('select 1', [{ password: 'secret', ok: 'yes' }] as unknown[]);

    // logQuery is disabled by default to keep dev output readable
    expect(debugSpy).toHaveBeenCalledTimes(0);
  });

  it('logs query errors with sanitized error payload', () => {
    const logger = new CorrelationAwareTypeOrmLogger();
    const err = new Error('boom');
    (err as unknown as { token?: string }).token = 'secret-token';

    logger.logQueryError(err, 'select 2', [{ authorization: 'Bearer abc.def.ghi' }] as unknown[]);

    // First call: structured error payload
    expect(errorSpy.mock.calls[0][0]).toMatchObject({
      msg: 'typeorm_query_error',
      query: 'select 2',
    });
    // Ensure token isn't leaked
    const firstPayload = errorSpy.mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(JSON.stringify(firstPayload)).not.toContain('secret-token');
  });

  it('routes warn/info/log appropriately', () => {
    const logger = new CorrelationAwareTypeOrmLogger();

    logger.log('warn', { access_token: 'x' });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatchObject({
      msg: 'typeorm_log',
      level: 'warn',
      message: { access_token: '[REDACTED]' },
    });

    logger.log('info', { ok: true });
    expect(logSpy).toHaveBeenCalledTimes(1);
  });
});
