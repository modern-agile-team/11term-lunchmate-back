import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-kakao';
import { UserGender } from 'src/users/types/user.type';
@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('KAKAO_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('KAKAO_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('KAKAO_CALLBACK_URI'),
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any, info?: any) => void,
  ) {
    try {
      const { id, username, displayName, provider, _json } = profile;
      const { email, gender, birthyear, birthday } = _json.kakao_account;

      const user = {
        providerId: `${provider}_${id}`,
        email,
        name: username,
        nickname: displayName,
        gender: this.setGender(gender),
        birthDate: this.setBirthDate(birthyear, birthday),
        accessToken,
        refreshToken,
      };

      done(null, user);
    } catch (error) {
      done(error);
    }
  }

  setGender(kakaoProfileGender: string | null): string | null {
    if (kakaoProfileGender)
      return kakaoProfileGender === 'male' ? UserGender.MALE : UserGender.FEMALE;

    return null;
  }

  setBirthDate(birthYear: string, birthDay: string): string | null {
    if (!birthDay || !birthYear) return null;

    const birthDate = `${birthYear}${birthDay}`;

    if (!/^\d{8}$/.test(birthDate)) return null;

    const formattedDate = birthDate.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');

    return new Date(formattedDate).toISOString();
  }
}
