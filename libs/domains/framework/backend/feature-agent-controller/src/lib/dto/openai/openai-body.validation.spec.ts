import { BadRequestException } from '@nestjs/common';
import { parseChatCompletionsBody, parseCompletionsBody, parseResponsesBody } from './openai-body.validation';

describe('openai-body.validation', () => {
  it('parseChatCompletionsBody parses valid body', () => {
    const r = parseChatCompletionsBody({
      model: 'm1',
      messages: [{ role: 'user', content: 'hi' }],
      stream: true,
    });
    expect(r.model).toBe('m1');
    expect(r.messages).toHaveLength(1);
    expect(r.stream).toBe(true);
  });

  it('parseChatCompletionsBody rejects invalid', () => {
    expect(() => parseChatCompletionsBody({})).toThrow(BadRequestException);
  });

  it('parseCompletionsBody normalizes prompt', () => {
    const r = parseCompletionsBody({ model: 'm', prompt: 'x' });
    expect(r.model).toBe('m');
    expect(r.prompt).toBe('x');
  });

  it('parseResponsesBody requires input', () => {
    expect(() => parseResponsesBody({ model: 'm' })).toThrow(BadRequestException);
    const r = parseResponsesBody({ model: 'm', input: 'hello' });
    expect(r.input).toBe('hello');
  });
});
