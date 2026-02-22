/**
 * Injection token for an optional statistics service.
 * Consuming apps can provide their own implementation via this token.
 * If not provided, statistics recording is silently skipped.
 */
export const IDENTITY_STATISTICS_SERVICE = Symbol('IDENTITY_STATISTICS_SERVICE');

/**
 * Minimal interface for recording entity lifecycle events.
 * Only the methods used by identity services are declared here.
 * Implementations should be fire-and-forget (errors logged, not thrown).
 */
export interface IIdentityStatisticsService {
  recordEntityCreated(
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown> | undefined,
    userId: string | undefined,
  ): Promise<void>;

  recordEntityUpdated(
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown> | undefined,
    userId: string | undefined,
  ): Promise<void>;

  recordEntityDeleted(entityType: string, entityId: string, userId: string | undefined): Promise<void>;
}
