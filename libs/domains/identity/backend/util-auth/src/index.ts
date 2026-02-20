// Existing exports
export * from './lib/hybrid-auth.guard';
export * from './lib/keycloak.guard';
export * from './lib/keycloak.module';
export * from './lib/keycloak.service';
export * from './lib/keycloak.types';
export * from './lib/rate-limit.config';

// Phase 2a: New exports
export * from './lib/password.service';
export * from './lib/token.utils';
export * from './lib/decorators/public.decorator';
export * from './lib/decorators/keycloak-roles.decorator';
export * from './lib/decorators/users-roles.decorator';
export * from './lib/entities/user.entity';
export * from './lib/entities/client-user.entity';
export * from './lib/entities/authentication-type.enum';
export * from './lib/entities/client.entity.types';
export * from './lib/client-access.utils';
export * from './lib/statistics.interface';
