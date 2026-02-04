import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';
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
export class KeycloakUserSyncGuard implements CanActivate {
  constructor(private readonly usersRepository: UsersRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
