import { User } from 'src/users/entities/user.entity';
import { ResponsePostDetailDto, UserNameDto } from '../dtos/response-post.dto';
import { Post } from '../entities/post.entity';

export class PostMapper {
  static toDetailDto(post: Post): ResponsePostDetailDto {
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      viewCount: post.viewCount,
      commentCount: post.commentCount,
      user: post.isAnonymous ? null : this.toUserDto(post.user),
      category: post.category,
      likeCount: post.likeCount,
      isAnonymous: post.isAnonymous,
      createdAt: post.createdAt,
    };
  }

  static toUserDto(user: User): UserNameDto {
    return {
      id: user.id,
      nickname: user.nickname,
    };
  }
}
