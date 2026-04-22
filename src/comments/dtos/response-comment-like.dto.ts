import { ApiProperty } from '@nestjs/swagger';

export class ResponseCommentLikeDto {
  @ApiProperty()
  commentId: number;

  @ApiProperty()
  liked: boolean;

  @ApiProperty()
  likeCount: number;
}
