import { Test, TestingModule } from '@nestjs/testing';

import { HealthController, HealthResponseDto } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('getHealth', () => {
    it('should return health status with ok status', () => {
      const result = controller.getHealth();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('number');
    });

    it('should return current timestamp', () => {
      const before = Date.now();
      const result = controller.getHealth();
      const after = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });

    it('should return correct response structure', () => {
      const result: HealthResponseDto = controller.getHealth();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(Number),
      });
    });
  });
});
