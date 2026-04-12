import { ApiProperty } from '@nestjs/swagger';

export class ResponsePostLikeDto {
  @ApiProperty()
  postId: number;

  @ApiProperty()
  liked: boolean;

  @ApiProperty()
  likeCount: number;
}
