import { ResponseCommentLikeDto } from '../dtos/response-comment-like.dto';
import { Comment } from '../entities/comment.entity';

export class CommentLikeMapper {
  static toCommentLikeDto(comment: Comment, liked: boolean): ResponseCommentLikeDto {
    return {
      commentId: comment.id,
      liked,
      likeCount: comment.likeCount,
    };
  }
}
