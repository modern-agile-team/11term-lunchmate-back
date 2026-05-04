import { CommentLikeRepository } from 'src/comments/comment-like.repository';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CommentRepository } from './comments.repository';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { Comment } from './entities/comment.entity';
import { PostRepository } from 'src/posts/posts.repository';
import { DataSource } from 'typeorm';
import { UpdateCommentDto } from './dtos/update-comment.dto';
import { FindCommentsQueryDto } from './dtos/find-comments-query.dto';
import { PAGINATION_CONSTANTS } from './constants/comment.constant';
import { CursorPaginatedResult } from 'src/commons/types/cursor-pagination.type';

@Injectable()
export class CommentService {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly postRepository: PostRepository,
    private readonly commentLikeRepository: CommentLikeRepository,
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

    const foundComment = await this.commentRepository.findByCommentIdAndPostId(
      createdCommentId,
      postId,
    );

    if (!foundComment) throw new InternalServerErrorException('생성된 댓글 조회에 실패했습니다.');

    return foundComment;
  }

  async findCommentOrThrow(commentId: number, postId: number): Promise<Comment> {
    const comment = await this.commentRepository.findByCommentIdAndPostId(commentId, postId);

    if (!comment) throw new NotFoundException('존재하지 않는 댓글입니다.');

    return comment;
  }

  async findCommentsByPostId(
    postId: number,
    findCommentsQueryDto: FindCommentsQueryDto,
  ): Promise<CursorPaginatedResult<Comment>> {
    const existingPost = await this.postRepository.findPostById(postId);
    if (!existingPost) throw new NotFoundException('존재하지 않는 게시글입니다.');

    const limit = findCommentsQueryDto.limit ?? PAGINATION_CONSTANTS.DEFAULT_LIMIT;
    const cursor = findCommentsQueryDto.cursor ?? null;
    const comments = await this.commentRepository.findCommentsByPostId(postId, cursor, limit);

    const hasNext = comments.length > limit;
    const paginatedComments = hasNext ? comments.slice(0, limit) : comments;
    const nextCursor = hasNext ? paginatedComments[paginatedComments.length - 1].id : null;

    return {
      items: paginatedComments,
      nextCursor,
      hasNext,
    };
  }

  async editComment(
    updateCommentDto: UpdateCommentDto,
    postId: number,
    commentId: number,
    userId: number,
  ): Promise<Comment> {
    const existingPost = await this.postRepository.findPostById(postId);
    if (!existingPost) throw new NotFoundException('존재하지 않는 게시글입니다.');

    const existingComment = await this.findCommentOrThrow(commentId, postId);

    if (existingComment.user.id !== userId)
      throw new ForbiddenException('댓글을 수정할 권한이 없습니다.');

    if (updateCommentDto.content !== undefined) existingComment.content = updateCommentDto.content;
    if (updateCommentDto.isAnonymous !== undefined)
      existingComment.isAnonymous = updateCommentDto.isAnonymous;

    return await this.commentRepository.updateComment(existingComment);
  }

  async deleteComment(postId: number, commentId: number, userId: number): Promise<void> {
    const existingPost = await this.postRepository.findPostById(postId);
    if (!existingPost) throw new NotFoundException('존재하지 않는 게시글입니다.');

    const existingComment = await this.findCommentOrThrow(commentId, postId);

    if (existingComment.user.id !== userId)
      throw new ForbiddenException('댓글을 삭제할 권한이 없습니다.');

    await this.dataSource.transaction(async (manager) => {
      const deletedResult = await this.commentRepository.deleteComment(commentId, manager);
      if (!deletedResult.affected)
        throw new InternalServerErrorException('댓글 삭제에 실패했습니다.');

      await this.postRepository.decreaseCommentCount(postId, manager);
    });
  }

  async likeComment(postId: number, commentId: number, userId: number): Promise<Comment> {
    await this.findCommentOrThrow(commentId, postId);

    const existingLike = await this.commentLikeRepository.findByCommentIdAndUserId(
      commentId,
      userId,
    );
    if (existingLike) throw new BadRequestException('이미 좋아요한 댓글입니다.');

    return await this.dataSource.transaction(async (manager) => {
      await this.commentLikeRepository.likeComment(commentId, userId, manager);

      await this.commentRepository.increaseCommentLikeCount(commentId, manager);

      const likedComment = await this.commentRepository.findByCommentIdAndPostId(
        commentId,
        postId,
        manager,
      );
      if (!likedComment)
        throw new InternalServerErrorException('좋아요한 댓글을 찾을 수 없습니다.');

      return likedComment;
    });
  }

  async unlikeComment(postId: number, commentId: number, userId: number): Promise<Comment> {
    await this.findCommentOrThrow(commentId, postId);

    const existingLike = await this.commentLikeRepository.findByCommentIdAndUserId(
      commentId,
      userId,
    );
    if (!existingLike) throw new BadRequestException('좋아요하지 않은 댓글입니다.');

    return await this.dataSource.transaction(async (manager) => {
      const deleteResult = await this.commentLikeRepository.unlikeComment(
        commentId,
        userId,
        manager,
      );
      if (!deleteResult.affected)
        throw new InternalServerErrorException('댓글 좋아요 취소에 실패했습니다.');

      await this.commentRepository.decreaseCommentLikeCount(commentId, manager);

      const unlikedComment = await this.commentRepository.findByCommentIdAndPostId(
        commentId,
        postId,
        manager,
      );
      if (!unlikedComment)
        throw new InternalServerErrorException('좋아요 취소한 댓글을 찾을 수 없습니다.');

      return unlikedComment;
    });
  }
}
