import { CorrelationAwareConsoleLogger } from './correlation-aware-console-logger';
import { runWithCorrelationId } from './correlation-id.storage';

describe('CorrelationAwareConsoleLogger', () => {
  let stdoutSpy: jest.SpiedFunction<typeof process.stdout.write>;

  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('prefixes text logs with correlation id when AsyncLocalStorage has a value', () => {
    const logger = new CorrelationAwareConsoleLogger({ colors: false, json: false });
    runWithCorrelationId('req-abc', () => {
      logger.log('hello');
    });
    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join('');
    expect(output).toContain('[corr=req-abc]');
    expect(output).toContain('hello');
  });

  it('omits correlation prefix when outside runWithCorrelationId', () => {
    const logger = new CorrelationAwareConsoleLogger({ colors: false, json: false });
    logger.log('hello');
    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join('');
    expect(output).not.toContain('[corr=');
    expect(output).toContain('hello');
  });

  it('adds correlationId to JSON log objects', () => {
    const logger = new CorrelationAwareConsoleLogger({ json: true, colors: false });
    runWithCorrelationId('json-corr', () => {
      logger.log('hello');
    });
    const line = String(stdoutSpy.mock.calls[0][0]).trim();
    const parsed = JSON.parse(line) as { correlationId?: string; message: string };
    expect(parsed.correlationId).toBe('json-corr');
    expect(parsed.message).toBe('hello');
  });
});
