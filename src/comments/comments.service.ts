import { Injectable, NotFoundException } from '@nestjs/common';
import { CommentRepository } from './comments.repository';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { Comment } from './entities/comment.entity';
import { PostRepository } from 'src/posts/posts.repository';
import { DataSource } from 'typeorm';

@Injectable()
export class CommentService {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly postRepository: PostRepository,
    private readonly dataSource: DataSource,
  ) {}

  async createComment(
    createCommentDto: CreateCommentDto,
    postId: number,
    userId: number,
  ): Promise<Comment> {
    const post = await this.postRepository.findPostById(postId);
    if (!post) throw new NotFoundException('존재하지 않는 게시글입니다.');

    const createdCommentId = await this.dataSource.transaction(async (manager) => {
      const createdComment = await this.commentRepository.createComment(
        createCommentDto,
        postId,
        userId,
        manager,
      );

      await this.postRepository.increaseCommentCount(postId, manager);

      return createdComment.id;
    });

    return this.findCommentById(createdCommentId);
  }

  async findCommentById(commentId: number): Promise<Comment> {
    const comment = await this.commentRepository.findCommentById(commentId);
    if (!comment) throw new NotFoundException('존재하지 않는 댓글입니다.');

    return comment;
  }
}
