import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

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
  @IsString()
  @MinLength(4)
  @MaxLength(4)
  mbti?: string;
}
