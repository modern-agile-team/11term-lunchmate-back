import { ApiProperty } from '@nestjs/swagger';

export class ResponseCommentDetailDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  user: CommentAuthorDto | null;
}

export class CommentAuthorDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nickname: string;
}

export class ResponseCommentListDto {
  @ApiProperty()
  items: ResponseCommentListItemDto[];

  @ApiProperty()
  nextCursor: number | null;

  @ApiProperty()
  hasNext: boolean;
}

export class ResponseCommentListItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  user: CommentAuthorDto | null;
}
