export interface JwtAccessPayload {
  sub: number;
  email: string;
  nickname: string;
  tokenVersion: number;
  tokenId: string;
  type: 'access';
}

export interface JwtRefreshPayload {
  sub: number;
  email: string;
  nickname: string;
  tokenVersion: number;
  tokenId: string;
  type: 'refresh';
}

export interface AuthenticatedUser {
  userId: number;
  email: string;
  nickname: string;
}
