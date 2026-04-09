import { POST_CONSTANTS } from '../constants/post.constant';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePostDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ApiProperty({ example: '학생식당 돈까스 맛있어요' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(POST_CONSTANTS.MAX_TITLE)
  title: string;

  @ApiProperty({
    example: `오늘 점심에 학생식당 돈까스 먹었는데 진짜 너무 맛있었어요. 소스가 특히 맛있었어요.`,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(POST_CONSTANTS.MAX_CONTENTS)
  content: string;

  @ApiProperty({
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  @IsPositive()
  categoryId: number;

  @ApiProperty({
    example: false,
  })
  @IsBoolean()
  @IsNotEmpty()
  isAnonymous: boolean;
}
