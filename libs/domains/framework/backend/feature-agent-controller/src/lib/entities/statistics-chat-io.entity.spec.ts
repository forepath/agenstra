import { ChatDirection, StatisticsChatIoEntity } from './statistics-chat-io.entity';

describe('StatisticsChatIoEntity', () => {
  it('should create an instance', () => {
    const entity = new StatisticsChatIoEntity();
    expect(entity).toBeDefined();
  });

  it('should have all required properties', () => {
    const entity = new StatisticsChatIoEntity();
    entity.id = 'chat-io-uuid';
    entity.statisticsClientId = 'stats-client-uuid';
    entity.direction = ChatDirection.INPUT;
    entity.wordCount = 10;
    entity.charCount = 50;
    entity.occurredAt = new Date();

    expect(entity.id).toBe('chat-io-uuid');
    expect(entity.statisticsClientId).toBe('stats-client-uuid');
    expect(entity.direction).toBe(ChatDirection.INPUT);
    expect(entity.wordCount).toBe(10);
    expect(entity.charCount).toBe(50);
    expect(entity.occurredAt).toBeInstanceOf(Date);
  });

  it('should allow optional statisticsAgentId and statisticsUserId', () => {
    const entity = new StatisticsChatIoEntity();
    entity.statisticsAgentId = undefined;
    entity.statisticsUserId = undefined;

    expect(entity.statisticsAgentId).toBeUndefined();
    expect(entity.statisticsUserId).toBeUndefined();
  });

  it('should support INPUT direction', () => {
    const entity = new StatisticsChatIoEntity();
    entity.direction = ChatDirection.INPUT;
    expect(entity.direction).toBe(ChatDirection.INPUT);
    expect(entity.direction).toBe('input');
  });

  it('should support OUTPUT direction', () => {
    const entity = new StatisticsChatIoEntity();
    entity.direction = ChatDirection.OUTPUT;
    expect(entity.direction).toBe(ChatDirection.OUTPUT);
    expect(entity.direction).toBe('output');
  });
});
