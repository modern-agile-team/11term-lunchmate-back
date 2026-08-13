import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SearchUsersQueryDto {
  @ApiProperty({
    example: 'lunchmate',
    description: '닉네임(부분 일치) 또는 이메일(완전 일치)',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  keyword: string;
}
