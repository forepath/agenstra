import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from './password.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('PasswordService', () => {
  let service: PasswordService;
  const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'test-password';
      const hashedPassword = 'hashed-password';
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await service.hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 10);
    });
  });

  describe('verifyPassword', () => {
    it('should return true when password matches', async () => {
      const password = 'test-password';
      const hash = 'hashed-password';
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.verifyPassword(password, hash);

      expect(result).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hash);
    });

    it('should return false when password does not match', async () => {
      const password = 'wrong-password';
      const hash = 'hashed-password';
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.verifyPassword(password, hash);

      expect(result).toBe(false);
    });
  });
});
