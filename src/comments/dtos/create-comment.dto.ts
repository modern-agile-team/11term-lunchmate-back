import { IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { COMMENT_CONSTANTS } from '../constants/comment.constant';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    example: `맞아요. 저도 동의합니다.`,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(COMMENT_CONSTANTS.MAX_CONTENTS)
  content: string;

  @ApiProperty({
    example: false,
  })
  @IsBoolean()
  @IsNotEmpty()
  isAnonymous: boolean;
}
