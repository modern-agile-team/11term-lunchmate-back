import { AuthProvider, UserRole } from 'src/users/types/user.type';

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

export interface JwtRegisterPayload {
  type: 'social_register';
  email: string;
  name: string;
  provider: AuthProvider;
  providerId: string;
  nickname?: string | null;
  gender?: string | null;
  birthDate?: string | null;
}

export interface AuthenticatedUser {
  userId: number;
  email: string;
  nickname: string;
  role: UserRole;
}
