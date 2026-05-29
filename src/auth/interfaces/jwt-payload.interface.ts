import { UserRole } from 'src/users/entities/user.entity';

export interface JwtAccessPayload {
  sub: number;
  email: string;
  nickname: string;
  role: UserRole;
  tokenVersion: number;
  tokenId: string;
  type: 'access';
}

export interface JwtRefreshPayload {
  sub: number;
  email: string;
  nickname: string;
  role: UserRole;
  tokenVersion: number;
  tokenId: string;
  type: 'refresh';
}

export interface AuthenticatedUser {
  userId: number;
  email: string;
  nickname: string;
  role: UserRole;
}
