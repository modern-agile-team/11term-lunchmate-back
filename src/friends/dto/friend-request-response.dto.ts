import { ApiProperty } from '@nestjs/swagger';
import { FriendStatus } from '../entities/friend.entity';

export class FriendRequestResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  requesterId: number;

  @ApiProperty()
  receiverId: number;

  @ApiProperty({ enum: FriendStatus })
  status: FriendStatus;

  @ApiProperty()
  createdAt: string;
}
