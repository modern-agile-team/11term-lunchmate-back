import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOperation,
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
}
