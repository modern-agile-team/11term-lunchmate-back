import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password1234',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: '1999-01-01',
  })
  @IsDateString()
  birthDate: string;

  @ApiProperty({
    example: 'MALE',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsIn(['MALE', 'FEMALE'])
  gender: 'MALE' | 'FEMALE';

  @ApiProperty({
    example: 'lunchmate',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nickname: string;

  @ApiProperty({
    example: 'Hongik University',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  schoolInfo: string;

  @ApiProperty({
    required: false,
    example: '오늘 점심 메이트 구해요.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  introduce?: string;

  @ApiProperty({
    required: false,
    example: 'ENFP',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(4)
  @MaxLength(4)
  mbti?: string;
}
