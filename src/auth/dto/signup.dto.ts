import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

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
    example: '홍길동',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'lunchmate',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nickname: string;

  @ApiProperty({
    required: false,
    example: 'https://example.com/profile.jpg',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  profileImageUrl?: string;

  @ApiProperty({
    required: false,
    example: '오늘 점심 메이트 구해요.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

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
