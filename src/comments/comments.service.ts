import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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

    const foundComment = await this.findCommentById(createdCommentId);
    if (!foundComment) throw new InternalServerErrorException('생성된 댓글 조회에 실패했습니다.');

    return foundComment;
  }

  async findCommentById(commentId: number): Promise<Comment | null> {
    return await this.commentRepository.findCommentById(commentId);
  }
}
