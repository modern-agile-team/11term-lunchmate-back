import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class GetFriendRequestListQueryDto {
  @ApiPropertyOptional({
    example: 'sent',
    enum: ['sent', 'received'],
    description: '생략 시 보낸/받은 요청 모두 반환',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @IsIn(['sent', 'received'])
  direction?: 'sent' | 'received';
}
