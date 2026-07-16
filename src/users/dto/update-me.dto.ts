import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Mbti } from '../types/user.type';

export class UpdateMeDto {
  @ApiPropertyOptional({
    example: 'lunchmate',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nickname?: string;

  @ApiPropertyOptional({
    example: '1999-01-01',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({
    example: 'MALE',
    enum: ['MALE', 'FEMALE'],
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsIn(['MALE', 'FEMALE'])
  gender?: 'MALE' | 'FEMALE';

  @ApiPropertyOptional({
    example: 'Hongik University',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  schoolInfo?: string;

  @ApiPropertyOptional({
    example: '오늘 점심 메이트 구해요.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  introduce?: string;

  @ApiPropertyOptional({
    example: 'ENFP',
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsEnum(Mbti)
  mbti?: Mbti | null;

  @ApiPropertyOptional({
    example:
      'https://lunchmate-s3.s3.ap-northeast-2.amazonaws.com/profile-images/1_1752000000000_uuid.png',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  @MaxLength(500)
  profileImageUrl?: string;
}
