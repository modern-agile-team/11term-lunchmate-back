import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { SocialUserProps } from '../types/social-user.type';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URI'),
      scope: ['email', 'profile'],
      accessType: 'offline',
      prompt: 'consent',
    });
  }

  validate(accessToken: string, refreshToken: string, profile: Profile) {
    const { id, displayName, emails, provider } = profile;

    const googleUser: SocialUserProps = {
      providerId: `${provider}_${id}`,
      email: emails[0]?.value ?? '',
      name: displayName,
      accessToken,
      refreshToken: refreshToken ?? null,
    };

    return googleUser;
  }
}
