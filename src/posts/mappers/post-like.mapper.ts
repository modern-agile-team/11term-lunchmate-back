import { ResponsePostLikeDto } from '../dtos/response-post-like.dto';
import { Post } from '../entities/post.entity';

export class PostLikeMapper {
  static toPostLikeDto(post: Post, liked: boolean): ResponsePostLikeDto {
    return {
      postId: post.id,
      liked,
      likeCount: post.likeCount,
    };
  }
}
