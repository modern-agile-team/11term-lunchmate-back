import { ApiProperty } from '@nestjs/swagger';

export class ResponseCommentDto {
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
