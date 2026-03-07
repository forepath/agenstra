import { InvoiceRefsRepository } from './invoice-refs.repository';

const createMockQueryBuilder = () => ({
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  getRawOne: jest.fn(),
});

describe('InvoiceRefsRepository', () => {
  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>;
  let mockRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(() => {
    jest.resetAllMocks();
    mockQueryBuilder = createMockQueryBuilder();
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };
  });

  describe('findOpenOverdueSummaryByUserId', () => {
    it('returns count and totalBalance from query result', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ count: '2', total: '99.50' });
      const repository = new InvoiceRefsRepository(mockRepository as never);

      const result = await repository.findOpenOverdueSummaryByUserId('user-1');

      expect(result).toEqual({ count: 2, totalBalance: 99.5 });
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('ref');
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('ref.subscription', 'sub');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('sub.userId = :userId', { userId: 'user-1' });
    });

    it('returns zero count and total when getRawOne returns null', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue(null);
      const repository = new InvoiceRefsRepository(mockRepository as never);

      const result = await repository.findOpenOverdueSummaryByUserId('user-1');

      expect(result).toEqual({ count: 0, totalBalance: 0 });
    });

    it('parses string total as float', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ count: '1', total: '42.25' });
      const repository = new InvoiceRefsRepository(mockRepository as never);

      const result = await repository.findOpenOverdueSummaryByUserId('user-1');

      expect(result.totalBalance).toBe(42.25);
    });
  });
});
