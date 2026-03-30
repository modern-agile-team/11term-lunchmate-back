import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { FriendListResponseDto } from './dto/friend-list-response.dto';
import { FriendRequestResponseDto } from './dto/friend-request-response.dto';
import { GetFriendListQueryDto } from './dto/get-friend-list-query.dto';
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
    return this.friendService.findFriends(currentUser.userId, query.status);
  }

  @Post('requests')
  @Authenticated()
  @ApiOperation({ summary: '친구 신청' })
  @ApiCreatedResponse({ type: FriendRequestResponseDto })
  async createFriendRequest(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createFriendRequestDto: CreateFriendRequestDto,
  ): Promise<FriendRequestResponseDto> {
    return this.friendService.createRequest(currentUser.userId, createFriendRequestDto.receiverId);
  }

  @Patch('requests/:friendshipId/accept')
  @Authenticated()
  @ApiOperation({ summary: '친구 신청 수락' })
  @ApiOkResponse({ type: FriendRequestResponseDto })
  async acceptFriendRequest(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('friendshipId', ParseIntPipe) friendshipId: number,
  ): Promise<FriendRequestResponseDto> {
    return this.friendService.acceptRequest(currentUser.userId, friendshipId);
  }

  @Patch('requests/:friendshipId/reject')
  @Authenticated()
  @ApiOperation({ summary: '친구 신청 거절' })
  @ApiOkResponse({ type: FriendRequestResponseDto })
  async rejectFriendRequest(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('friendshipId', ParseIntPipe) friendshipId: number,
  ): Promise<FriendRequestResponseDto> {
    return this.friendService.rejectRequest(currentUser.userId, friendshipId);
  }
}
