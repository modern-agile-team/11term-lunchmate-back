import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../users/users.service';
import { AUTH_ERROR_MESSAGES, JWT_DEFAULTS } from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthResponseDto, AuthTokensResponseDto } from './dto/auth-response.dto';

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

    const tokens = await this.issueTokens(user.id, user.email, user.nickname);

    return {
      ...tokens,
      user: this.userService.toMeResponse(user),
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateCredentials(loginDto);
    const tokens = await this.issueTokens(user.id, user.email, user.nickname);

    return {
      ...tokens,
      user: this.userService.toMeResponse(user),
    };
  }

  private async issueTokens(
    userId: number,
    email: string,
    nickname: string,
  ): Promise<AuthTokensResponseDto> {
    const accessTokenId = randomUUID();
    const refreshTokenId = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      this.buildAccessPayload(userId, email, nickname, accessTokenId),
      this.getAccessTokenOptions(),
    );

    const refreshToken = await this.jwtService.signAsync(
      this.buildRefreshPayload(userId, email, nickname, refreshTokenId),
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
    tokenId: string,
  ) {
    return {
      sub: userId,
      email,
      nickname,
      tokenId,
      type: 'access',
    };
  }

  private buildRefreshPayload(
    userId: number,
    email: string,
    nickname: string,
    tokenId: string,
  ) {
    return {
      sub: userId,
      email,
      nickname,
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
}
