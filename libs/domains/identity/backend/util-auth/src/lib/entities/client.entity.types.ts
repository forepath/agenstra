/**
 * Minimal type for ClientEntity used by client-access utilities.
 * The full ClientEntity with TypeORM decorators is in the feature-auth library.
 * Named `ClientEntityLike` to avoid collision with the full `ClientEntity` class.
 */
export interface ClientEntityLike {
  id: string;
  userId?: string;
}
