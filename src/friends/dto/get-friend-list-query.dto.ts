import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { FRIEND_ERROR_MESSAGES } from '../friend.constants';

export class GetFriendListQueryDto {
  @ApiPropertyOptional({
    example: 'accepted',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @IsIn(['accepted'], { message: FRIEND_ERROR_MESSAGES.acceptedStatusOnly })
  status?: 'accepted';
}
