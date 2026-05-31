export const JWT_DEFAULTS = {
  accessSecret: 'dev-access-secret',
  refreshSecret: 'dev-refresh-secret',
  accessExpiresIn: '15m',
  refreshExpiresIn: '7d',
} as const;

export const AUTH_ERROR_MESSAGES = {
  invalidCredentials: 'Invalid email or password.',
  invalidAccessToken: 'Access token is invalid.',
  invalidRefreshToken: 'Refresh token is invalid.',
  invaludTokenFormat: 'Token 포맷이 잘못되었습니다.',
  accessDenied: 'You do not have permission to access',
} as const;

export const ROLES_KEY = 'roles';
