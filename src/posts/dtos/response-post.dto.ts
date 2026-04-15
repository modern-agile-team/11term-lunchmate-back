import { ApiProperty } from '@nestjs/swagger';
import { PostCategory } from 'src/post-categories/entities/post-category.entity';

export class UserNameDto {
  id: number;
  nickname: string;
}

export class ResponsePostDetailDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  user: UserNameDto | null;

  @ApiProperty()
  category: PostCategory;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  isAnonymous: boolean;

  @ApiProperty()
  createdAt: string;
}
