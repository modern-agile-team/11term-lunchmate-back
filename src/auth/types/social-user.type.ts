import { AuthResult } from '../auth.service';

export type SocialUserProps = {
  providerId: string;
  email: string;
  name: string;
  nickname?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  accessToken: string;
  refreshToken: string | null;
};

export type SocialLoginResult =
  | { isNewUser: true; registerToken: string }
  | { isNewUser: false; authResult: AuthResult };
