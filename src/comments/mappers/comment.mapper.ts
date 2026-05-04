import { User } from 'src/users/entities/user.entity';
import { CommentAuthorDto, ResponseCommentDto } from '../dtos/response-comment.dto';
import { Comment } from '../entities/comment.entity';

export class CommentMapper {
  static toCommentDetailDto(comment: Comment): ResponseCommentDto {
    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      likeCount: comment.likeCount,
      user: comment.isAnonymous ? null : this.toAuthorDto(comment.user),
    };
  }

  static toAuthorDto(user: User): CommentAuthorDto {
    return {
      id: user.id,
      nickname: user.nickname,
    };
  }
}
