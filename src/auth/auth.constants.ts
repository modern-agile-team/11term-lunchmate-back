export const JWT_DEFAULTS = {
  accessSecret: 'dev-access-secret',
  refreshSecret: 'dev-refresh-secret',
  registerSecret: 'dev-register-secret',
  accessExpiresIn: '15m',
  refreshExpiresIn: '7d',
  registerExpiresIn: '10m',
  accessCookieMaxAge: 15 * 60 * 1000,
  refreshCookieMaxAge: 7 * 24 * 60 * 60 * 1000,
  registerCookieMaxAge: 10 * 60 * 1000,
} as const;

export const AUTH_ERROR_MESSAGES = {
  invalidCredentials: 'Invalid email or password.',
  invalidAccessToken: 'Access token is invalid.',
  invalidRefreshToken: 'Refresh token is invalid.',
  invalidRegisterToken: 'Register token is invalid.',
  invalidTokenFormat: 'Token 포맷이 잘못되었습니다.',
  accessDenied: 'You do not have permission to access',
} as const;

export const ROLES_KEY = 'roles';
