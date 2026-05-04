import { formatKoreaDate } from 'src/commons/utils/date-format.util';
import { User } from 'src/users/entities/user.entity';
import {
  CommentAuthorDto,
  ResponseCommentDetailDto,
  ResponseCommentListDto,
  ResponseCommentListItemDto,
} from '../dtos/response-comment.dto';
import { Comment } from '../entities/comment.entity';

export class CommentMapper {
  static toCommentDetailDto(comment: Comment): ResponseCommentDetailDto {
    return {
      id: comment.id,
      content: comment.content,
      createdAt: formatKoreaDate(comment.createdAt),
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

  static toCommentListDto(
    comments: Comment[],
    nextCursor: number | null,
    hasNext: boolean,
  ): ResponseCommentListDto {
    return {
      items: comments.map((comment) => this.toCommentListItemDto(comment)),
      nextCursor,
      hasNext,
    };
  }

  static toCommentListItemDto(comment: Comment): ResponseCommentListItemDto {
    return {
      id: comment.id,
      content: comment.content,
      createdAt: formatKoreaDate(comment.createdAt),
      likeCount: comment.likeCount,
      user: comment.isAnonymous ? null : this.toAuthorDto(comment.user),
    };
  }
}
