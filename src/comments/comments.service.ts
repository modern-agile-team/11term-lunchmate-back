import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommentRepository } from './comments.repository';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { Comment } from './entities/comment.entity';
import { PostRepository } from 'src/posts/posts.repository';
import { DataSource } from 'typeorm';
import { UpdateCommentDto } from './dtos/update-comment.dto';

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

    return this.findByCommentIdAndPostId(createdCommentId, postId);
  }

  async findByCommentIdAndPostId(commentId: number, postId: number): Promise<Comment> {
    const comment = await this.commentRepository.findByCommentIdAndPostId(commentId, postId);
    if (!comment) throw new NotFoundException('존재하지 않는 댓글입니다.');

    return comment;
  }

  async editComment(
    updateCommentDto: UpdateCommentDto,
    postId: number,
    commentId: number,
    userId: number,
  ): Promise<Comment> {
    const existingPost = await this.postRepository.findPostById(postId);
    if (!existingPost) throw new NotFoundException('존재하지 않는 게시글입니다.');

    const existingComment = await this.findByCommentIdAndPostId(commentId, postId);

    if (existingComment.user.id !== userId)
      throw new ForbiddenException('댓글을 수정할 권한이 없습니다.');

    await this.commentRepository.updateComment(updateCommentDto, commentId);

    return this.findByCommentIdAndPostId(commentId, postId);
  }
}
