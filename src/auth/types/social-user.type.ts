import { AuthResult } from '../auth.service';

export type SocialUserProps = {
  providerId: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string | null;
};

export type SocialLoginResult =
  | { isNewUser: true; registerToken: string }
  | { isNewUser: false; authResult: AuthResult };
