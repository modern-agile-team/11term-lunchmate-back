import { ApiProperty } from '@nestjs/swagger';
import { PublicUserResponseDto } from '../../users/dto/public-user-response.dto';
import { FriendStatus } from '../entities/friend.entity';

export class FriendListItemResponseDto {
  @ApiProperty()
  friendshipId: number;

  @ApiProperty({ enum: FriendStatus })
  status: FriendStatus;

  @ApiProperty({ type: PublicUserResponseDto })
  user: PublicUserResponseDto;
}
