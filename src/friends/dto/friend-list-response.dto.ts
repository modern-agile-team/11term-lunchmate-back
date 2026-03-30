import { ApiProperty } from '@nestjs/swagger';
import { FriendListItemResponseDto } from './friend-list-item-response.dto';

export class FriendListResponseDto {
  @ApiProperty({ type: [FriendListItemResponseDto] })
  items: FriendListItemResponseDto[];
}
