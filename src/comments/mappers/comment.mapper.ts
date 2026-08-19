import { User } from 'src/users/entities/user.entity';
import {
  CommentAuthorDto,
  ResponseCommentDetailDto,
  ResponseCommentListDto,
  ResponseCommentListItemDto,
} from '../dtos/response-comment.dto';
import { Comment } from '../entities/comment.entity';

export class CommentMapper {
  static toCommentDetailDto(comment: Comment, liked: boolean): ResponseCommentDetailDto {
    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      likeCount: comment.likeCount,
      user: comment.isAnonymous ? null : this.toAuthorDto(comment.user),
      liked,
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
    likedCommentIds: Set<number>,
  ): ResponseCommentListDto {
    return {
      items: comments.map((comment) =>
        this.toCommentListItemDto(comment, likedCommentIds.has(comment.id)),
      ),
      nextCursor,
      hasNext,
    };
  }

  static toCommentListItemDto(comment: Comment, liked: boolean): ResponseCommentListItemDto {
    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      likeCount: comment.likeCount,
      user: comment.isAnonymous ? null : this.toAuthorDto(comment.user),
      liked,
    };
  }
}
