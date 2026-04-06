import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PublicUserResponseDto } from '../users/dto/public-user-response.dto';
import { User } from '../users/entities/user.entity';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { FriendListItemResponseDto } from './dto/friend-list-item-response.dto';
import { FriendListResponseDto } from './dto/friend-list-response.dto';
import { FriendRequestResponseDto } from './dto/friend-request-response.dto';
import { GetFriendListQueryDto } from './dto/get-friend-list-query.dto';
import { Friend } from './entities/friend.entity';
import { FriendService } from './friends.service';

@ApiTags('Friend')
@Controller('friends')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Get()
  @Authenticated()
  @ApiOperation({ summary: '친구 목록 조회' })
  @ApiOkResponse({ type: FriendListResponseDto })
  async findFriends(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: GetFriendListQueryDto,
  ): Promise<FriendListResponseDto> {
    const friends = await this.friendService.findFriends(currentUser.userId, query.status);
    return this.toFriendListResponse(friends, currentUser.userId);
  }

  @Post('requests')
  @Authenticated()
  @ApiOperation({ summary: '친구 신청' })
  @ApiCreatedResponse({ type: FriendRequestResponseDto })
  async createFriendRequest(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createFriendRequestDto: CreateFriendRequestDto,
  ): Promise<FriendRequestResponseDto> {
    const friend = await this.friendService.createRequest(
      currentUser.userId,
      createFriendRequestDto.receiverId,
    );
    return this.toFriendRequestResponse(friend);
  }

  @Patch('requests/:friendshipId/accept')
  @Authenticated()
  @ApiOperation({ summary: '친구 신청 수락' })
  @ApiOkResponse({ type: FriendRequestResponseDto })
  async acceptFriendRequest(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('friendshipId', ParseIntPipe) friendshipId: number,
  ): Promise<FriendRequestResponseDto> {
    const friend = await this.friendService.acceptRequest(currentUser.userId, friendshipId);
    return this.toFriendRequestResponse(friend);
  }

  @Patch('requests/:friendshipId/reject')
  @Authenticated()
  @ApiOperation({ summary: '친구 신청 거절' })
  @ApiOkResponse({ type: FriendRequestResponseDto })
  async rejectFriendRequest(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('friendshipId', ParseIntPipe) friendshipId: number,
  ): Promise<FriendRequestResponseDto> {
    const friend = await this.friendService.rejectRequest(currentUser.userId, friendshipId);
    return this.toFriendRequestResponse(friend);
  }

  @Delete('requests/:friendshipId')
  @Authenticated()
  @HttpCode(204)
  @ApiOperation({ summary: '친구 신청 취소' })
  @ApiNoContentResponse()
  async cancelFriendRequest(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('friendshipId', ParseIntPipe) friendshipId: number,
  ): Promise<void> {
    await this.friendService.cancelRequest(currentUser.userId, friendshipId);
  }

  @Delete(':friendshipId')
  @Authenticated()
  @HttpCode(204)
  @ApiOperation({ summary: '친구 삭제' })
  @ApiNoContentResponse()
  async deleteFriend(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('friendshipId', ParseIntPipe) friendshipId: number,
  ): Promise<void> {
    await this.friendService.deleteFriend(currentUser.userId, friendshipId);
  }

  private toFriendRequestResponse(friend: Friend): FriendRequestResponseDto {
    return {
      id: friend.id,
      requesterId: friend.requester.id,
      receiverId: friend.receiver.id,
      status: friend.status,
      createdAt: friend.createdAt,
    };
  }

  private toFriendListResponse(
    friends: Friend[],
    currentUserId: number,
  ): FriendListResponseDto {
    return {
      items: friends.map((friend) => this.toFriendListItem(friend, currentUserId)),
    };
  }

  private toFriendListItem(friend: Friend, currentUserId: number): FriendListItemResponseDto {
    const otherUser = friend.requester.id === currentUserId ? friend.receiver : friend.requester;

    return {
      friendshipId: friend.id,
      status: friend.status,
      user: this.toPublicUserResponse(otherUser),
    };
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
}
