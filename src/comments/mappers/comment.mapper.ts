import { User } from 'src/users/entities/user.entity';
import {
  CommentAuthorDto,
  ResponseCommentDetailDto,
  ResponseCommentListDto,
  ResponseCommentListItemDto,
} from '../dtos/response-comment.dto';
import { Comment } from '../entities/comment.entity';

export class CommentMapper {
  static toCommentDetailDto(
    comment: Comment,
    liked: boolean,
    currentUserId: number | null,
  ): ResponseCommentDetailDto {
    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      likeCount: comment.likeCount,
      user: comment.isAnonymous ? null : this.toAuthorDto(comment.user),
      liked,
      isMine: comment.user.id === currentUserId,
    };
  }

  static toAuthorDto(user: User): CommentAuthorDto {
    return {
      id: user.id,
      nickname: user.nickname,
      profileImageUrl: user.profileImageUrl,
    };
  }

  static toCommentListDto(
    comments: Comment[],
    nextCursor: number | null,
    hasNext: boolean,
    likedCommentIds: Set<number>,
    currentUserId: number | null,
  ): ResponseCommentListDto {
    return {
      items: comments.map((comment) =>
        this.toCommentListItemDto(comment, likedCommentIds.has(comment.id), currentUserId),
      ),
      nextCursor,
      hasNext,
    };
  }

  static toCommentListItemDto(
    comment: Comment,
    liked: boolean,
    currentUserId: number | null,
  ): ResponseCommentListItemDto {
    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      likeCount: comment.likeCount,
      user: comment.isAnonymous ? null : this.toAuthorDto(comment.user),
      liked,
      isMine: comment.user.id === currentUserId,
    };
  }
}
