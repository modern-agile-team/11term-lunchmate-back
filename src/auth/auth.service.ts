import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../users/users.service';
import { AUTH_ERROR_MESSAGES, JWT_DEFAULTS } from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthResponseDto, AuthTokensResponseDto } from './dto/auth-response.dto';
import {
  JwtAccessPayload,
  JwtRefreshPayload,
} from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
    await this.assertSignupAvailable(signupDto);
    const hashedPassword = await bcrypt.hash(signupDto.password, 10);
    const user = await this.userService.createUser({
      email: signupDto.email,
      birthDate: signupDto.birthDate,
      gender: signupDto.gender,
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
      user.tokenVersion ?? 0,
    );

    return {
      ...tokens,
      user: this.userService.toMeResponse(user),
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateCredentials(loginDto);
    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.nickname,
      user.tokenVersion,
    );

    return {
      ...tokens,
      user: this.userService.toMeResponse(user),
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<AuthTokensResponseDto> {
    const payload = await this.verifyRefreshToken(refreshTokenDto.refreshToken);
    const user = await this.userService.findByIdForRefresh(payload.sub);

    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidRefreshToken);
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidRefreshToken);
    }

    const isRefreshTokenValid = await bcrypt.compare(
      this.createRefreshTokenFingerprint(refreshTokenDto.refreshToken),
      user.refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidRefreshToken);
    }

    const nextTokens = await this.issueTokensWithoutPersisting(
      user.id,
      user.email,
      user.nickname,
      user.tokenVersion,
    );

    const nextRefreshTokenHash = await this.createRefreshTokenHash(
      nextTokens.refreshToken,
    );
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

  private async issueTokens(
    userId: number,
    email: string,
    nickname: string,
    tokenVersion: number,
  ): Promise<AuthTokensResponseDto> {
    const tokens = await this.issueTokensWithoutPersisting(
      userId,
      email,
      nickname,
      tokenVersion,
    );
    const refreshTokenHash = await this.createRefreshTokenHash(tokens.refreshToken);
    await this.userService.updateRefreshTokenHash(userId, refreshTokenHash);

    return tokens;
  }

  private async issueTokensWithoutPersisting(
    userId: number,
    email: string,
    nickname: string,
    tokenVersion: number,
  ): Promise<AuthTokensResponseDto> {
    const accessTokenId = randomUUID();
    const refreshTokenId = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      this.buildAccessPayload(
        userId,
        email,
        nickname,
        tokenVersion,
        accessTokenId,
      ),
      this.getAccessTokenOptions(),
    );

    const refreshToken = await this.jwtService.signAsync(
      this.buildRefreshPayload(
        userId,
        email,
        nickname,
        tokenVersion,
        refreshTokenId,
      ),
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

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<JwtRefreshPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(
        refreshToken,
        {
          secret: this.configService.get<string>(
            'JWT_REFRESH_SECRET',
            JWT_DEFAULTS.refreshSecret,
          ),
        },
      );

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

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.hashedPassword,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.invalidCredentials);
    }

    return user;
  }

  private buildAccessPayload(
    userId: number,
    email: string,
    nickname: string,
    tokenVersion: number,
    tokenId: string,
  ): JwtAccessPayload {
    return {
      sub: userId,
      email,
      nickname,
      tokenVersion,
      tokenId,
      type: 'access',
    };
  }

  private buildRefreshPayload(
    userId: number,
    email: string,
    nickname: string,
    tokenVersion: number,
    tokenId: string,
  ): JwtRefreshPayload {
    return {
      sub: userId,
      email,
      nickname,
      tokenVersion,
      tokenId,
      type: 'refresh',
    };
  }

  private getAccessTokenOptions() {
    return {
      secret: this.configService.get<string>(
        'JWT_ACCESS_SECRET',
        JWT_DEFAULTS.accessSecret,
      ),
      jwtid: randomUUID(),
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_EXPIRES_IN',
        JWT_DEFAULTS.accessExpiresIn,
      ) as never,
    };
  }

  private getRefreshTokenOptions() {
    return {
      secret: this.configService.get<string>(
        'JWT_REFRESH_SECRET',
        JWT_DEFAULTS.refreshSecret,
      ),
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
