import { AuthProvider } from 'src/users/types/user.type';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExcludeEndpoint,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Authenticated } from './decorators/authenticated.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthResult, AuthService, AuthTokensResult } from './auth.service';
import { JWT_DEFAULTS } from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthResponseDto, AuthTokensResponseDto } from './dto/auth-response.dto';
import type { AuthenticatedUser, JwtRegisterPayload } from './interfaces/jwt-payload.interface';
import { CurrentUserResponseDto } from '../users/dto/current-user-response.dto';
import { User } from '../users/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';
import type { CookieOptions, Request, Response } from 'express';
import { SocialUserProps } from './types/social-user.type';
import { ConfigService } from '@nestjs/config';
import { SocialRegisterDto } from './dto/social-register.dto';
import { RegisterTokenGuard } from './guards/register-token.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  @ApiOperation({ summary: '회원가입' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  async signup(@Body() signupDto: SignupDto): Promise<AuthResponseDto> {
    const result = await this.authService.signup(signupDto);
    return this.toAuthResponse(result);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인' })
  @ApiOkResponse({ type: AuthResponseDto })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    const result = await this.authService.login(loginDto);
    return this.toAuthResponse(result);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: '구글 OAuth 로그인',
    description: '구글 로그인 페이지로 리다이렉트',
  })
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiExcludeEndpoint()
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const FRONT_URL = this.configService.getOrThrow<string>('FRONT_URL');

    const cookieOptions = this.setCookieOptions();

    const result = await this.authService.handleSocialLogin(
      AuthProvider.google,
      req.user as SocialUserProps,
    );

    if (result.isNewUser) {
      res.cookie('register_token', result.registerToken, {
        ...cookieOptions,
        maxAge: this.configService.get<number>(
          'COOKIE_REGISTER_MAX_AGE',
          JWT_DEFAULTS.registerCookieMaxAge,
        ),
      });
      return res.redirect(
        `${FRONT_URL}/${this.configService.getOrThrow<string>('FRONT_SOCIAL_ENDPOINT')}`,
      );
    }

    this.setTokens(
      res,
      result.authResult.accessToken,
      result.authResult.refreshToken,
      cookieOptions,
    );
    return res.redirect(FRONT_URL);
  }

  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({
    summary: '카카오 OAuth 로그인',
    description: '카카오 로그인 페이지로 리다이렉트',
  })
  async kakaoAuth() {}

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  @ApiExcludeEndpoint()
  async kakaoCallback(@Req() req: Request, @Res() res: Response) {
    const FRONT_URL = this.configService.getOrThrow<string>('FRONT_URL');
    const cookieOptions = this.setCookieOptions();

    const result = await this.authService.handleSocialLogin(
      AuthProvider.kakao,
      req.user as SocialUserProps,
    );

    if (result.isNewUser) {
      res.cookie('register_token', result.registerToken, {
        ...cookieOptions,
        maxAge: this.configService.get<number>(
          'COOKIE_REGISTER_MAX_AGE',
          JWT_DEFAULTS.registerCookieMaxAge,
        ),
      });
      return res.redirect(
        `${FRONT_URL}/${this.configService.getOrThrow<string>('FRONT_SOCIAL_ENDPOINT')}`,
      );
    }

    this.setTokens(
      res,
      result.authResult.accessToken,
      result.authResult.refreshToken,
      cookieOptions,
    );
    return res.redirect(FRONT_URL);
  }

  @Get('register/social')
  @UseGuards(RegisterTokenGuard)
  @ApiOperation({ summary: '소셜 회원가입 시 콜백으로 넘겨준 프로필 정보 토큰의 내용을 반환' })
  async getSocialRegisterDraft(@Req() request: Request & { socialUser: JwtRegisterPayload }) {
    const { email, name, nickname, gender, birthDate } = request.socialUser;

    return { email, name, nickname, gender, birthDate };
  }

  @Post('register/social')
  @UseGuards(RegisterTokenGuard)
  @ApiOperation({
    summary: '소셜 회원가입',
  })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'register_token이 없거나 유효하지 않음' })
  @ApiConflictResponse({ description: '이미 사용 중인 이메일 또는 닉네임' })
  @ApiBadRequestResponse({ description: '유효성 검사 실패' })
  async socialRegister(
    @Body() socialRegisterDto: SocialRegisterDto,
    @Req() request: Request & { socialUser: JwtRegisterPayload },
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.registerSocialUser(request.socialUser, socialRegisterDto);

    response.clearCookie('register_token');

    return this.toAuthResponse(result);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '토큰 재발급',
  })
  @ApiOkResponse({
    type: AuthTokensResponseDto,
    description: 'body 전달 시에만 JSON 응답. 쿠키 전달 시 빈 응답.',
  })
  @ApiUnauthorizedResponse({ description: 'refresh_token이 유효하지 않음' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokensResponseDto | void> {
    const fromCookie = refreshTokenDto.refreshToken ? false : true;
    const token = fromCookie ? req.cookies?.refresh_token : refreshTokenDto.refreshToken;
    const result = await this.authService.refresh(token);

    if (fromCookie) {
      const cookieOptions = this.setCookieOptions();
      this.setTokens(res, result.accessToken, result.refreshToken, cookieOptions);

      return;
    }

    return this.toAuthTokensResponse(result);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Authenticated()
  @ApiBearerAuth()
  @ApiOperation({ summary: '로그아웃' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  async logout(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(currentUser.userId);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
  }

  private toAuthResponse(result: AuthResult): AuthResponseDto {
    return {
      ...this.toAuthTokensResponse(result),
      user: this.toCurrentUserResponse(result.user),
    };
  }

  private toAuthTokensResponse(result: AuthTokensResult): AuthTokensResponseDto {
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  private toCurrentUserResponse(user: User): CurrentUserResponseDto {
    return {
      id: user.id,
      nickname: user.nickname,
      birthDate: user.birthDate,
      gender: user.gender,
      schoolInfo: user.schoolInfo,
      introduce: user.introduce,
      mbti: user.mbti,
      createdAt: user.createdAt,
      email: user.email,
      role: user.role,
    };
  }

  private setCookieOptions(): CookieOptions {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
    };
  }

  private setTokens(
    res: Response,
    accessToken: string,
    refreshToken: string,
    cookieOptions: CookieOptions,
  ): void {
    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: this.configService.get<number>(
        'COOKIE_ACCESS_MAX_AGE',
        JWT_DEFAULTS.accessCookieMaxAge,
      ),
    });
    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      path: '/auth/refresh',
      maxAge: this.configService.get<number>(
        'COOKIE_REFRESH_MAX_AGE',
        JWT_DEFAULTS.refreshCookieMaxAge,
      ),
    });
  }
}
