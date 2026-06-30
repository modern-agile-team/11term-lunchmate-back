import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { AUTH_ERROR_MESSAGES, JWT_DEFAULTS } from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import {
  JwtAccessPayload,
  JwtRefreshPayload,
  JwtRegisterPayload,
} from './interfaces/jwt-payload.interface';
import { SocialLoginResult, SocialUserProps } from './types/social-user.type';
import { AuthProvider, UserRole } from 'src/users/types/user.type';
import { SocialRegisterDto } from './dto/social-register.dto';

export type AuthTokensResult = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResult = AuthTokensResult & {
  user: User;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(signupDto: SignupDto): Promise<AuthResult> {
    await this.assertSignupAvailable(signupDto);
    const hashedPassword = await bcrypt.hash(signupDto.password, 10);
    const user = await this.userService.createUser({
      email: signupDto.email,
      birthDate: signupDto.birthDate,
      gender: signupDto.gender,
      name: signupDto.name,
      nickname: signupDto.nickname,
      hashedPassword,
      schoolInfo: signupDto.schoolInfo,
      introduce: signupDto.introduce ?? null,
      mbti: signupDto.mbti ?? null,
    });

    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.nickname,
      user.role,
      user.tokenVersion ?? 0,
    );

    return {
      ...tokens,
      user,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResult> {
    const user = await this.validateCredentials(loginDto);
    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.nickname,
      user.role,
      user.tokenVersion,
    );

    return {
      ...tokens,
      user,
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokensResult> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.userService.findByIdForRefresh(payload.sub);

    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidRefreshToken);
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidRefreshToken);
    }

    const isRefreshTokenValid = await bcrypt.compare(
      this.createRefreshTokenFingerprint(refreshToken),
      user.refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidRefreshToken);
    }

    const nextTokens = await this.issueTokensWithoutPersisting(
      user.id,
      user.email,
      user.nickname,
      user.role,
      user.tokenVersion,
    );

    const nextRefreshTokenHash = await this.createRefreshTokenHash(nextTokens.refreshToken);
    const rotated = await this.userService.rotateRefreshTokenHash(
      user.id,
      user.refreshTokenHash,
      nextRefreshTokenHash,
    );

    if (!rotated) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidRefreshToken);
    }

    return nextTokens;
  }

  async logout(userId: number): Promise<void> {
    await this.userService.revokeTokens(userId);
  }

  async verifyAccessToken(accessToken: string): Promise<JwtAccessPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtAccessPayload>(accessToken, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET', JWT_DEFAULTS.accessSecret),
      });

      if (payload.type !== 'access') {
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidAccessToken);
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidAccessToken);
    }
  }

  async handleSocialLogin(
    provider: AuthProvider,
    socialUserProps: SocialUserProps,
  ): Promise<SocialLoginResult> {
    const existingUser = await this.userService.findByProviderId(
      provider,
      socialUserProps.providerId,
    );

    if (existingUser) {
      if (socialUserProps.refreshToken) {
        await this.userService.updateProviderToken(
          existingUser.id,
          socialUserProps.accessToken,
          socialUserProps.refreshToken,
        );
      }

      const tokens = await this.issueTokens(
        existingUser.id,
        existingUser.email,
        existingUser.nickname,
        existingUser.role,
        existingUser.tokenVersion,
      );

      return { isNewUser: false, authResult: { user: existingUser, ...tokens } };
    }

    const emailTaken = await this.userService.existsByEmail(socialUserProps.email);
    if (emailTaken) throw new ConflictException('이미 다른 방식으로 가입된 이메일입니다.');

    return {
      isNewUser: true,
      registerToken: this.issueRegisterToken(socialUserProps, provider),
    };
  }

  async registerSocialUser(
    registerPayload: JwtRegisterPayload,
    socialRegisterDto: SocialRegisterDto,
  ): Promise<AuthResult> {
    await Promise.all([
      this.userService.assertEmailAvailable(registerPayload.email),
      this.userService.assertNicknameAvailable(socialRegisterDto.nickname),
    ]);

    const user = await this.userService.createSocialUser({
      email: registerPayload.email,
      name: registerPayload.name,
      provider: registerPayload.provider,
      providerId: registerPayload.providerId,
      nickname: socialRegisterDto.nickname,
      birthDate: socialRegisterDto.birthDate,
      gender: socialRegisterDto.gender,
      schoolInfo: socialRegisterDto.schoolInfo,
      introduce: socialRegisterDto.introduce,
      mbti: socialRegisterDto.mbti,
    });

    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.nickname,
      user.role,
      user.tokenVersion ?? 0,
    );

    return { user, ...tokens };
  }

  private async issueTokens(
    userId: number,
    email: string,
    nickname: string,
    role: UserRole,
    tokenVersion: number,
  ): Promise<AuthTokensResult> {
    const tokens = await this.issueTokensWithoutPersisting(
      userId,
      email,
      nickname,
      role,
      tokenVersion,
    );
    const refreshTokenHash = await this.createRefreshTokenHash(tokens.refreshToken);
    await this.userService.updateRefreshTokenHash(userId, refreshTokenHash);

    return tokens;
  }

  private issueRegisterToken(socialUserProps: SocialUserProps, provider: AuthProvider): string {
    const { accessToken, refreshToken, ...payload } = socialUserProps;
    return this.jwtService.sign(
      {
        type: 'social_register',
        provider,
        ...payload,
      },
      {
        secret: this.configService.get<string>('JWT_REGISTER_SECRET', JWT_DEFAULTS.registerSecret),
        expiresIn: this.configService.get<string>(
          'JWT_REGISTER_EXPIRES_IN',
          JWT_DEFAULTS.registerExpiresIn,
        ) as never,
      },
    );
  }

  private async issueTokensWithoutPersisting(
    userId: number,
    email: string,
    nickname: string,
    role: UserRole,
    tokenVersion: number,
  ): Promise<AuthTokensResult> {
    const accessTokenId = randomUUID();
    const refreshTokenId = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      this.buildAccessPayload(userId, email, nickname, role, tokenVersion, accessTokenId),
      this.getAccessTokenOptions(),
    );

    const refreshToken = await this.jwtService.signAsync(
      this.buildRefreshPayload(userId, email, nickname, role, tokenVersion, refreshTokenId),
      this.getRefreshTokenOptions(),
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private async assertSignupAvailable(signupDto: SignupDto): Promise<void> {
    await Promise.all([
      this.userService.assertEmailAvailable(signupDto.email),
      this.userService.assertNicknameAvailable(signupDto.nickname),
    ]);
  }

  private async verifyRefreshToken(refreshToken: string): Promise<JwtRefreshPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', JWT_DEFAULTS.refreshSecret),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidRefreshToken);
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidRefreshToken);
    }
  }

  private async validateCredentials(loginDto: LoginDto) {
    const user = await this.userService.findByEmailForLogin(loginDto.email);

    if (!user) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidCredentials);
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.hashedPassword as string);

    if (!isPasswordValid) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidCredentials);
    }

    return user;
  }

  private buildAccessPayload(
    userId: number,
    email: string,
    nickname: string,
    role: UserRole,
    tokenVersion: number,
    tokenId: string,
  ): JwtAccessPayload {
    return {
      sub: userId,
      email,
      nickname,
      role,
      tokenVersion,
      tokenId,
      type: 'access',
    };
  }

  private buildRefreshPayload(
    userId: number,
    email: string,
    nickname: string,
    role: UserRole,
    tokenVersion: number,
    tokenId: string,
  ): JwtRefreshPayload {
    return {
      sub: userId,
      email,
      nickname,
      role,
      tokenVersion,
      tokenId,
      type: 'refresh',
    };
  }

  private getAccessTokenOptions() {
    return {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET', JWT_DEFAULTS.accessSecret),
      jwtid: randomUUID(),
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_EXPIRES_IN',
        JWT_DEFAULTS.accessExpiresIn,
      ) as never,
    };
  }

  private getRefreshTokenOptions() {
    return {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', JWT_DEFAULTS.refreshSecret),
      jwtid: randomUUID(),
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        JWT_DEFAULTS.refreshExpiresIn,
      ) as never,
    };
  }

  private createRefreshTokenFingerprint(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private createRefreshTokenHash(refreshToken: string): Promise<string> {
    return bcrypt.hash(this.createRefreshTokenFingerprint(refreshToken), 10);
  }
}
