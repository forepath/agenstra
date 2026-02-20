import { getAuthenticationMethod, IS_PUBLIC_KEY } from '@forepath/identity/backend';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface UsersJwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

@Injectable()
export class UsersAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
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

    if (getAuthenticationMethod() !== 'users') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Pass through when user is already set (e.g. by API key or other auth)
    if (request['user']) {
      return true;
    }

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing or invalid authorization token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<UsersJwtPayload>(token);
      request['user'] = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles ?? ['user'],
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
