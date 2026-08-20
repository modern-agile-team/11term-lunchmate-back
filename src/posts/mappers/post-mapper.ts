import { User } from 'src/users/entities/user.entity';
import {
  PostAuthorDto,
  ResponsePostDetailDto,
  ResponsePostListDto,
  ResponsePostListItemDto,
} from '../dtos/response-post.dto';
import { Post } from '../entities/post.entity';

export class PostMapper {
  static toListDto(
    posts: Post[],
    nextCursor: number | null,
    hasNext: boolean,
    currentUserId: number | null,
  ): ResponsePostListDto {
    return {
      items: posts.map((post) => this.toListItemDto(post, currentUserId)),
      nextCursor,
      hasNext,
    };
  }

  static toListItemDto(post: Post, currentUserId: number | null): ResponsePostListItemDto {
    return {
      id: post.id,
      title: post.title,
      viewCount: post.viewCount,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      createdAt: post.createdAt,
      user: post.isAnonymous ? null : this.toPostAuthorDto(post.user),
      category: post.category,
      isMine: post.user.id === currentUserId,
    };
  }

  static toDetailDto(
    post: Post,
    liked: boolean,
    currentUserId: number | null,
  ): ResponsePostDetailDto {
    return {
      ...this.toListItemDto(post, currentUserId),
      content: post.content,
      isAnonymous: post.isAnonymous,
      liked,
    };
  }

  static toPostAuthorDto(user: User): PostAuthorDto {
    return {
      id: user.id,
      nickname: user.nickname,
    };
  }
}
