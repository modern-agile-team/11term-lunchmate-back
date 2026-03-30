export const JWT_DEFAULTS = {
  accessSecret: 'dev-access-secret',
  refreshSecret: 'dev-refresh-secret',
  accessExpiresIn: '15m',
  refreshExpiresIn: '7d',
} as const;

export const AUTH_ERROR_MESSAGES = {
  invalidCredentials: 'Invalid email or password.',
  invalidRefreshToken: 'Refresh token is invalid.',
} as const;
