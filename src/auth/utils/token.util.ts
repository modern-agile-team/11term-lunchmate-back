import { UnauthorizedException } from '@nestjs/common';

export function extractAccessToken(rawToken: string): string {
  if (rawToken.startsWith('Bearer')) {
    const [, token] = rawToken.split(' ');

    if (!token) throw new UnauthorizedException();

    return token;
  }

  return rawToken;
}
