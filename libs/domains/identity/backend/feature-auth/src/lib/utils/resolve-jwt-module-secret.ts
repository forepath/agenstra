/**
 * JwtModule.register() evaluates `secret` at module load time. Jest often runs with
 * NODE_ENV inherited from CI (e.g. production); use JEST_WORKER_ID to still apply a
 * dev-only default in test workers.
 */
export function resolveJwtModuleSecret(authenticationMethodLabel: string): string {
  const secret = process.env.JWT_SECRET;

  if (secret && secret.trim().length > 0) {
    return secret.trim();
  }

  const isTestContext = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

  if (isTestContext) {
    return 'test-jwt-secret';
  }

  throw new Error(`JWT_SECRET must be set when AUTHENTICATION_METHOD=${authenticationMethodLabel}`);
}
