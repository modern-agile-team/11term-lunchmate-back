import { Injectable } from '@nestjs/common';
import { CommentRepository } from './comments.repository';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { PostService } from 'src/posts/posts.service';

@Injectable()
export class CommentService {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly postService: PostService,
  ) {}

  async createComment(
    createCommentDto: CreateCommentDto,
    postId: number,
    userId: number,
  ): Promise<Comment> {
    const post = await this.postService.findPostByIdOrThrow(postId);

    // 댓글 저장

    // 저장된 댓글 반환
  }
}
