import { ApiProperty } from '@nestjs/swagger';
import { FriendRequestListItemResponseDto } from './friend-request-list-item-response.dto';

export class FriendRequestListResponseDto {
  @ApiProperty({ type: [FriendRequestListItemResponseDto] })
  items: FriendRequestListItemResponseDto[];
}
