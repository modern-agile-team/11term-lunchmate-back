export interface JwtAccessPayload {
  sub: number;
  email: string;
  nickname: string;
  tokenId: string;
  type: 'access';
}

export interface AuthenticatedUser {
  userId: number;
  email: string;
  nickname: string;
}
