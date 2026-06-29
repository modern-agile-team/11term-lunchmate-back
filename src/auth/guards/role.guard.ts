import { Reflector } from '@nestjs/core';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { USER_ERROR_MESSAGES } from 'src/users/user.constants';
import { AUTH_ERROR_MESSAGES, ROLES_KEY } from '../auth.constants';
import { UserRole } from 'src/users/types/user.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length < 1) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException(USER_ERROR_MESSAGES.userNotFound);

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) throw new ForbiddenException(AUTH_ERROR_MESSAGES.accessDenied);

    return true;
  }
}
