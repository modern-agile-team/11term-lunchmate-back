import { ApiProperty } from '@nestjs/swagger';
import { PublicUserResponseDto } from '../../users/dto/public-user-response.dto';

export class FriendRequestListItemResponseDto {
  @ApiProperty()
  friendshipId: number;

  @ApiProperty()
  requesterId: number;

  @ApiProperty()
  receiverId: number;

  @ApiProperty({ enum: ['SENT', 'RECEIVED'] })
  direction: 'SENT' | 'RECEIVED';

  @ApiProperty({ type: PublicUserResponseDto, description: '상대방 프로필' })
  user: PublicUserResponseDto;

  @ApiProperty()
  createdAt: string;
}
