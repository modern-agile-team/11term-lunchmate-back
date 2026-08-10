import { ConfigService } from '@nestjs/config';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtRegisterPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class RegisterTokenGuard implements CanActivate {
  private readonly logger = new Logger(RegisterTokenGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const cookies = request.cookies as Record<string, string> | undefined;
    const registerToken = cookies?.register_token ?? this.extractTokenFromHeader(request);

    if (!registerToken) throw new UnauthorizedException();

    try {
      const payload: JwtRegisterPayload = await this.jwtService.verifyAsync(registerToken, {
        secret: this.configService.getOrThrow<string>('JWT_REGISTER_SECRET'),
      });

      if (payload.type !== 'social_register') throw new UnauthorizedException();

      request.socialUser = payload;
    } catch (error) {
      const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      this.logger.warn(`register_token verification failed - ${reason}`);
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
