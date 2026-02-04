import { createConfirmationCode, validateConfirmationCode } from './token.utils';

describe('token.utils', () => {
  describe('createConfirmationCode', () => {
    it('should create 6-character alphanumeric code', async () => {
      const { code, hash } = createConfirmationCode();
      const codeHash = await hash;

      expect(code).toMatch(/^[A-Z0-9]{6}$/);
      expect(codeHash).toBeDefined();
      expect(codeHash.length).toBeGreaterThan(50);
    });

    it('should create unique codes', () => {
      const { code: code1 } = createConfirmationCode();
      const { code: code2 } = createConfirmationCode();
      expect(code1).not.toBe(code2);
    });
  });

  describe('validateConfirmationCode', () => {
    it('should validate correct code', async () => {
      const { code, hash } = createConfirmationCode();
      const codeHash = await hash;

      const result = await validateConfirmationCode(code, codeHash);
      expect(result).toBe(true);
    });

    it('should reject invalid code', async () => {
      const { code, hash } = createConfirmationCode();
      const codeHash = await hash;

      const result = await validateConfirmationCode(code + '1', codeHash);
      expect(result).toBe(false);
    });

    it('should reject when storedHash is null', async () => {
      const result = await validateConfirmationCode('123456', null);
      expect(result).toBe(false);
    });

    it('should reject invalid format input', async () => {
      const { hash } = createConfirmationCode();
      const codeHash = await hash;

      expect(await validateConfirmationCode('12345', codeHash)).toBe(false);
      expect(await validateConfirmationCode('ABC1234', codeHash)).toBe(false);
      expect(await validateConfirmationCode('abc123', codeHash)).toBe(false);
      expect(await validateConfirmationCode('', codeHash)).toBe(false);
    });
  });
});
