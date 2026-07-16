import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUserResponseDto } from './dto/current-user-response.dto';
import { PublicUserResponseDto } from './dto/public-user-response.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { User } from './entities/user.entity';
import { UserService } from './users.service';

@ApiTags('User')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @Authenticated()
  @ApiOperation({ summary: '내 정보 조회' })
  @ApiOkResponse({ type: CurrentUserResponseDto })
  async getMe(@CurrentUser() currentUser: AuthenticatedUser): Promise<CurrentUserResponseDto> {
    const user = await this.userService.findMe(currentUser.userId);
    return this.toCurrentUserResponse(user);
  }

  @Patch('me')
  @Authenticated()
  @ApiOperation({ summary: '내 프로필 수정' })
  @ApiOkResponse({ type: CurrentUserResponseDto })
  async updateMe(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() updateMeDto: UpdateMeDto,
  ): Promise<CurrentUserResponseDto> {
    const user = await this.userService.updateMe(currentUser.userId, updateMeDto);
    return this.toCurrentUserResponse(user);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Authenticated()
  @ApiOperation({ summary: '회원 탈퇴' })
  @ApiNoContentResponse()
  async deleteMe(@CurrentUser() currentUser: AuthenticatedUser): Promise<void> {
    await this.userService.withdraw(currentUser.userId);
  }

  @Get(':userId')
  @ApiOperation({ summary: '공개 유저 조회' })
  @ApiOkResponse({ type: PublicUserResponseDto })
  async findUserById(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<PublicUserResponseDto> {
    const user = await this.userService.findPublicUserById(userId);
    return this.toPublicUserResponse(user);
  }

  private toPublicUserResponse(user: User): PublicUserResponseDto {
    return {
      id: user.id,
      nickname: user.nickname,
      birthDate: user.birthDate,
      gender: user.gender,
      schoolInfo: user.schoolInfo,
      introduce: user.introduce,
      mbti: user.mbti,
      createdAt: user.createdAt,
    };
  }

  private toCurrentUserResponse(user: User): CurrentUserResponseDto {
    return {
      ...this.toPublicUserResponse(user),
      email: user.email,
      role: user.role,
    };
  }
}
