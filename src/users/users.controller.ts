import {
  Body,
  Controller,
  Delete,
  forwardRef,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { FriendService } from '../friends/friends.service';
import { RelationshipStatus } from '../friends/types/relationship-status.type';
import { S3_CONSTANT } from '../s3/constants/s3.constant';
import { ImageResponseDto } from '../s3/dto/s3.dto';
import { S3Service } from '../s3/s3.service';
import { CurrentUserResponseDto } from './dto/current-user-response.dto';
import { PublicUserResponseDto } from './dto/public-user-response.dto';
import { SearchUsersQueryDto } from './dto/search-users-query.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UserSearchResponseDto } from './dto/user-search-response.dto';
import { UserSearchResultDto } from './dto/user-search-result.dto';
import { User } from './entities/user.entity';
import { UserService } from './users.service';

@ApiTags('User')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly s3Service: S3Service,
    @Inject(forwardRef(() => FriendService))
    private readonly friendService: FriendService,
  ) {}

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

  @Post('me/profile-image')
  @Authenticated()
  @ApiOperation({ summary: '프로필 이미지 업로드' })
  @ApiOkResponse({ type: ImageResponseDto })
  @UseInterceptors(FileInterceptor('image'))
  async uploadProfileImage(
    @CurrentUser() currentUser: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: S3_CONSTANT.ALLOWED_IMAGE_TYPES })
        .addMaxSizeValidator({ maxSize: S3_CONSTANT.MAX_IMAGE_SIZE })
        .build(),
    )
    image: Express.Multer.File,
  ): Promise<ImageResponseDto> {
    return this.s3Service.uploadImage(currentUser.userId, image);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Authenticated()
  @ApiOperation({ summary: '회원 탈퇴' })
  @ApiNoContentResponse()
  async deleteMe(@CurrentUser() currentUser: AuthenticatedUser): Promise<void> {
    await this.userService.withdraw(currentUser.userId);
  }

  @Get('search')
  @Authenticated()
  @ApiOperation({ summary: '닉네임/이메일로 유저 검색' })
  @ApiOkResponse({ type: UserSearchResponseDto })
  async searchUsers(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: SearchUsersQueryDto,
  ): Promise<UserSearchResponseDto> {
    const users = await this.userService.searchUsers(query.keyword, currentUser.userId);
    const relationshipStatuses = await this.friendService.mapRelationshipStatuses(
      currentUser.userId,
      users.map((user) => user.id),
    );

    return {
      items: users.map((user) => this.toSearchResult(user, relationshipStatuses)),
    };
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
      profileImageUrl: user.profileImageUrl,
    };
  }

  private toCurrentUserResponse(user: User): CurrentUserResponseDto {
    return {
      ...this.toPublicUserResponse(user),
      email: user.email,
      role: user.role,
    };
  }

  private toSearchResult(
    user: User,
    relationshipStatuses: Map<number, RelationshipStatus>,
  ): UserSearchResultDto {
    return {
      id: user.id,
      nickname: user.nickname,
      profileImageUrl: user.profileImageUrl,
      schoolInfo: user.schoolInfo,
      relationshipStatus: relationshipStatuses.get(user.id) ?? RelationshipStatus.NONE,
    };
  }
}
