import { JwtRegisterPayload } from '../auth/interfaces/jwt-payload.interface';

declare global {
  namespace Express {
    interface Request {
      socialUser?: JwtRegisterPayload;
    }
  }
}

export {};
