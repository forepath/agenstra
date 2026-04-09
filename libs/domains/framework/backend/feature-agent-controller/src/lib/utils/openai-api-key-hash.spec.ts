import { generateOpenAiStyleApiKey, hashOpenAiApiKey } from './openai-api-key-hash';

describe('openai-api-key-hash', () => {
  it('hashOpenAiApiKey should be stable for same input', () => {
    const k = 'test-key';
    expect(hashOpenAiApiKey(k)).toBe(hashOpenAiApiKey(k));
    expect(hashOpenAiApiKey(k)).toHaveLength(64);
  });

  it('generateOpenAiStyleApiKey should produce unique values', () => {
    const a = generateOpenAiStyleApiKey();
    const b = generateOpenAiStyleApiKey();
    expect(a).not.toEqual(b);
    expect(a.startsWith('agenstra_oai_')).toBe(true);
  });
});
