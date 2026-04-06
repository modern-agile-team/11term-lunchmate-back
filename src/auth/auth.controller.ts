import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Authenticated } from './decorators/authenticated.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthResult, AuthService, AuthTokensResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthResponseDto, AuthTokensResponseDto } from './dto/auth-response.dto';
import type { AuthenticatedUser } from './interfaces/jwt-payload.interface';
import { CurrentUserResponseDto } from '../users/dto/current-user-response.dto';
import { User } from '../users/entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '토큰 재발급' })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthTokensResponseDto> {
    const result = await this.authService.refresh(refreshTokenDto);
    return this.toAuthTokensResponse(result);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Authenticated()
  @ApiOperation({ summary: '로그아웃' })
  @ApiNoContentResponse()
  async logout(@CurrentUser() currentUser: AuthenticatedUser): Promise<void> {
    await this.authService.logout(currentUser.userId);
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
    };
  }
}
