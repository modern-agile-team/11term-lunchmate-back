import { Body, Controller, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { FriendRequestResponseDto } from './dto/friend-request-response.dto';
import { FriendService } from './friends.service';

@ApiTags('Friend')
@Controller('friends')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Post('requests')
  @Authenticated()
  @ApiOperation({ summary: '친구 신청' })
  @ApiCreatedResponse({ type: FriendRequestResponseDto })
  async createFriendRequest(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createFriendRequestDto: CreateFriendRequestDto,
  ): Promise<FriendRequestResponseDto> {
    return this.friendService.createRequest(
      currentUser.userId,
      createFriendRequestDto.receiverId,
    );
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
