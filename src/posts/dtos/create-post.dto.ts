import { PickType } from '@nestjs/mapped-types';
import { Post } from '../entities/post.entity';

export class CreatePostDto extends PickType(Post, ['title', 'content', 'category']) {
  //  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  // @ApiProperty({ example: '밥 같이 먹을 사람' })
  // @IsString()
  // @IsNotEmpty()
  // @MaxLength(ROOM_CONSTANTS.TITLE_MAX_LENGTH)
}
