import { getAuthenticationMethod, IS_PUBLIC_KEY, UserRole } from '@forepath/identity/backend';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersRepository } from '../repositories/users.repository';

/**
 * Keycloak token payload attached to request by nest-keycloak-connect.
 */
interface KeycloakTokenPayload {
  sub?: string;
  email?: string;
  preferred_username?: string;
  [key: string]: unknown;
}

/**
 * Guard that syncs Keycloak-authenticated users to the users table.
 * First user gets admin role, subsequent users get user role.
 * Runs after Keycloak AuthGuard; ensures request.user has our format { id, email, roles }.
 */
@Injectable()
export class KeycloakAuthGuard implements CanActivate {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    if (getAuthenticationMethod() !== 'keycloak') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tokenPayload = request.user as KeycloakTokenPayload | undefined;

    if (!tokenPayload?.sub) {
      return true;
    }

    const email = tokenPayload.email || tokenPayload.preferred_username || `${tokenPayload.sub}@keycloak`;
    const user = await this.syncUser(tokenPayload.sub, email);
    request.user = {
      id: user.id,
      username: user.email,
      roles: [user.role],
    };

    return true;
  }

  private async syncUser(keycloakSub: string, email: string): Promise<{ id: string; email: string; role: UserRole }> {
    let user = await this.usersRepository.findByKeycloakSub(keycloakSub);
    if (user) {
      return { id: user.id, email: user.email, role: user.role };
    }

    const count = await this.usersRepository.count();
    const role = count === 0 ? UserRole.ADMIN : UserRole.USER;

    user = await this.usersRepository.findByEmail(email.toLowerCase());
    if (user) {
      await this.usersRepository.update(user.id, { keycloakSub });
      return { id: user.id, email: user.email, role: user.role };
    }

    user = await this.usersRepository.create({
      email: email.toLowerCase(),
      keycloakSub,
      role,
      emailConfirmedAt: new Date(),
    });

    return { id: user.id, email: user.email, role: user.role };
  }
}
