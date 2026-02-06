import { ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import type { ClientUserEntity } from '../entities/client-user.entity';
import { ClientUserRole } from '../entities/client-user.entity';
import type { ClientEntity } from '../entities/client.entity';
import { UserRole } from '../entities/user.entity';

/** Minimal interface for client access check - findById */
export interface ClientAccessClientsRepository {
  findById(id: string): Promise<ClientEntity | null>;
}

/** Minimal interface for client access check - findUserClientAccess */
export interface ClientAccessClientUsersRepository {
  findUserClientAccess(userId: string, clientId: string): Promise<ClientUserEntity | null>;
}

export interface RequestWithUser extends Request {
  user?: { id: string; email?: string; roles?: string[]; username?: string };
  apiKeyAuthenticated?: boolean;
}

/** User info from socket auth (stored in socket.data) */
export interface SocketUserInfo {
  userId?: string;
  userRole?: UserRole;
  isApiKeyAuth: boolean;
  user?: { id: string; email?: string; roles?: string[] };
}

/**
 * Build a RequestWithUser-like object from socket auth data for use with ensureClientAccess.
 */
export function buildRequestFromSocketUser(socketUser: SocketUserInfo): RequestWithUser {
  return {
    user: socketUser.user ?? (socketUser.userId ? { id: socketUser.userId, roles: [] } : undefined),
    apiKeyAuthenticated: socketUser.isApiKeyAuth,
  } as RequestWithUser;
}

export interface UserInfoFromRequest {
  userId?: string;
  userRole?: UserRole;
  isApiKeyAuth: boolean;
}

export interface ClientAccessResult {
  hasAccess: boolean;
  isClientCreator: boolean;
  clientUserRole?: ClientUserRole;
}

/**
 * Extract user information from request for permission checks.
 * @param req - The request object
 * @returns User information or undefined
 */
export function getUserFromRequest(req: RequestWithUser): UserInfoFromRequest {
  const isApiKeyAuth = !!req.apiKeyAuthenticated;
  if (isApiKeyAuth) {
    return { isApiKeyAuth: true };
  }

  const user = req.user;
  if (!user?.id) {
    return { isApiKeyAuth: false };
  }

  let userRole: UserRole = UserRole.USER;
  if (user.roles?.includes('admin') || user.roles?.includes(UserRole.ADMIN)) {
    userRole = UserRole.ADMIN;
  }

  return {
    userId: user.id,
    userRole,
    isApiKeyAuth: false,
  };
}

/**
 * Check if user has access to a client and get their client role.
 * @param clientsRepository - Repository for client lookup
 * @param clientUsersRepository - Repository for client-user relationship lookup
 * @param clientId - The UUID of the client
 * @param userId - The UUID of the user
 * @param userRole - The role of the user (from users table)
 * @param isApiKeyAuth - Whether the request is authenticated via API key
 * @returns Object with access status and client user role if applicable
 */
export async function checkClientAccess(
  clientsRepository: ClientAccessClientsRepository,
  clientUsersRepository: ClientAccessClientUsersRepository,
  clientId: string,
  userId: string | undefined,
  userRole: UserRole | undefined,
  isApiKeyAuth: boolean,
): Promise<ClientAccessResult> {
  if (isApiKeyAuth) {
    return { hasAccess: true, isClientCreator: false };
  }

  if (!userId || !userRole) {
    return { hasAccess: false, isClientCreator: false };
  }

  if (userRole === UserRole.ADMIN) {
    return { hasAccess: true, isClientCreator: false };
  }

  const client = await clientsRepository.findById(clientId);
  if (!client) {
    return { hasAccess: false, isClientCreator: false };
  }

  const isClientCreator = client.userId === userId;

  const clientUser = await clientUsersRepository.findUserClientAccess(userId, clientId);
  if (clientUser) {
    return { hasAccess: true, isClientCreator, clientUserRole: clientUser.role };
  }

  if (isClientCreator) {
    return { hasAccess: true, isClientCreator: true };
  }

  return { hasAccess: false, isClientCreator: false };
}

/**
 * Ensure user has access to a client, throwing ForbiddenException if not.
 * @param clientsRepository - Repository for client lookup
 * @param clientUsersRepository - Repository for client-user relationship lookup
 * @param clientId - The UUID of the client
 * @param req - The request object
 * @returns Access information including client user role
 */
export async function ensureClientAccess(
  clientsRepository: ClientAccessClientsRepository,
  clientUsersRepository: ClientAccessClientUsersRepository,
  clientId: string,
  req?: RequestWithUser,
): Promise<{ isClientCreator: boolean; clientUserRole?: ClientUserRole }> {
  const userInfo = getUserFromRequest(req || ({} as RequestWithUser));
  const access = await checkClientAccess(
    clientsRepository,
    clientUsersRepository,
    clientId,
    userInfo.userId,
    userInfo.userRole,
    userInfo.isApiKeyAuth,
  );
  if (!access.hasAccess) {
    throw new ForbiddenException('You do not have access to this client');
  }
  return { isClientCreator: access.isClientCreator, clientUserRole: access.clientUserRole };
}
