import { PickType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { PostCategory } from 'src/post-categories/entities/post-category.entity';

export class PostAuthorDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
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

  @ApiProperty({ type: () => PostAuthorDto, nullable: true })
  user: PostAuthorDto | null;

  @ApiProperty({ type: () => PostCategory })
  category: PostCategory;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  isAnonymous: boolean;

  @ApiProperty()
  createdAt: string;
}

export class ResponsePostListItemDto extends PickType(ResponsePostDetailDto, [
  'id',
  'title',
  'createdAt',
  'likeCount',
  'viewCount',
  'commentCount',
  'user',
]) {}

export class ResponsePostListDto {
  @ApiProperty({ type: () => [ResponsePostListItemDto] })
  items: ResponsePostListItemDto[];

  @ApiProperty({ nullable: true })
  nextCursor: number | null;

  @ApiProperty()
  hasNext: boolean;
}

export class ResponsePostViewCountDto {
  @ApiProperty()
  viewCount: number;
}
