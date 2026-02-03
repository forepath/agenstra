import { createTokenWithUserId, validateTokenAgainstHash } from './token.utils';

describe('token.utils', () => {
  describe('createTokenWithUserId', () => {
    it('should create token with embedded userId', async () => {
      const userId = 'user-uuid-123';
      const { token, hash } = createTokenWithUserId(userId);
      const tokenHash = await hash;

      expect(token).toContain('.');
      const [encodedUserId] = token.split('.');
      expect(Buffer.from(encodedUserId, 'base64url').toString('utf8')).toBe(userId);
      expect(tokenHash).toBeDefined();
      expect(tokenHash.length).toBeGreaterThan(50);
    });
  });

  describe('validateTokenAgainstHash', () => {
    it('should validate correct token', async () => {
      const userId = 'user-123';
      const { token, hash } = createTokenWithUserId(userId);
      const tokenHash = await hash;

      const result = await validateTokenAgainstHash(token, tokenHash);
      expect(result).toEqual({ userId });
    });

    it('should reject invalid token', async () => {
      const userId = 'user-123';
      const { token, hash } = createTokenWithUserId(userId);
      const tokenHash = await hash;

      const result = await validateTokenAgainstHash(token + 'x', tokenHash);
      expect(result).toBeNull();
    });

    it('should reject when storedHash is null', async () => {
      const result = await validateTokenAgainstHash('any.token', null);
      expect(result).toBeNull();
    });

    it('should reject malformed token', async () => {
      const { hash } = createTokenWithUserId('user-123');
      const tokenHash = await hash;

      expect(await validateTokenAgainstHash('no-dot', tokenHash)).toBeNull();
      expect(await validateTokenAgainstHash('', tokenHash)).toBeNull();
    });
  });
});
