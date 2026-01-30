/**
 * Metadata stored in context. Only properties used by at least one transformer are stored.
 * metadata.json must still contain version and appName for validation; only appName is passed to context.
 */
export interface AgenstraMetadata {
  appName: string;
}
