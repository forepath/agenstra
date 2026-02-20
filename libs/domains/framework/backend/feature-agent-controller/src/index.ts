// Re-export identity auth symbols for backward compatibility
// Consumers should migrate to importing directly from @forepath/identity/backend
export {
  // Decorators
  KeycloakRoles,
  UsersRoles,
  Public,
  // Entities
  UserEntity,
  UserRole,
  ClientUserEntity,
  ClientUserRole,
  ClientEntity,
  AuthenticationType,
  ClientEntityLike,
  ClientAgentCredentialEntity,
  // Repositories
  UsersRepository,
  ClientUsersRepository,
  ClientAgentCredentialsRepository,
  // Guards
  UsersAuthGuard,
  UsersRolesGuard,
  KeycloakAuthGuard,
  KeycloakRolesGuard,
  // Services
  AuthService,
  UsersService,
  SocketAuthService,
  KeycloakTokenService,
  ClientAgentCredentialsService,
  ClientUsersService,
  PasswordService,
  // Controllers
  AuthController,
  UsersController,
  // Modules
  UsersAuthModule,
  KeycloakUserSyncModule,
  // DTOs
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  ConfirmEmailDto,
  CreateUserDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  UpdateUserDto,
  UserResponseDto,
  AddClientUserDto,
  ClientUserResponseDto,
  // Utils
  ensureClientAccess,
  checkClientAccess,
  getUserFromRequest,
  RequestWithUser,
  // Statistics interface
  IIdentityStatisticsService,
  IDENTITY_STATISTICS_SERVICE,
  // Token utils
  createConfirmationCode,
  validateConfirmationCode,
} from '@forepath/identity/backend';

// Framework-owned exports (files that stay in this library)
export * from './lib/dto/client-response.dto';
export * from './lib/dto/create-client-response.dto';
export * from './lib/dto/create-client.dto';
export * from './lib/dto/update-client.dto';
export * from './lib/entities/provisioning-reference.entity';
export * from './lib/entities/statistics-agent.entity';
export * from './lib/entities/statistics-chat-filter-drop.entity';
export * from './lib/entities/statistics-chat-filter-flag.entity';
export * from './lib/entities/statistics-chat-io.entity';
export * from './lib/entities/statistics-client-user.entity';
export * from './lib/entities/statistics-client.entity';
export * from './lib/entities/statistics-entity-event.entity';
export * from './lib/entities/statistics-provisioning-reference.entity';
export * from './lib/entities/statistics-user.entity';
export * from './lib/modules/clients.module';
export * from './lib/modules/statistics.module';
export * from './lib/repositories/clients.repository';
export * from './lib/repositories/statistics.repository';
export * from './lib/services/client-agent-proxy.service';
export * from './lib/services/clients.service';
export * from './lib/services/statistics.service';
