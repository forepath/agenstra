import { getAuthenticationMethod } from '@forepath/identity/backend';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { USERS_ROLES_KEY } from '../decorators/users-roles.decorator';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class UsersRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    if (getAuthenticationMethod() !== 'users') {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(USERS_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const roles = user?.roles;

    if (!Array.isArray(roles)) {
      return false;
    }

    return requiredRoles.some((role) => roles.includes(role));
  }
}
