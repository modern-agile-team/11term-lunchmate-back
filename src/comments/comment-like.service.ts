import { Injectable } from '@nestjs/common';
import { CommentLikeRepository } from './comment-like.repository';
import { DeleteResult, EntityManager } from 'typeorm';
import { CommentLike } from './entities/comment-like.entity';

@Injectable()
export class CommentLikeService {
  constructor(private readonly commentLikeRepository: CommentLikeRepository) {}

  async findByCommentLikeIdAndUserId(
    commentId: number,
    userId: number,
  ): Promise<CommentLike | null> {
    return await this.commentLikeRepository.findByCommentLikeIdAndUserId(commentId, userId);
  }

  async likeComment(
    commentId: number,
    userId: number,
    manager: EntityManager,
  ): Promise<CommentLike> {
    return await this.commentLikeRepository.likeComment(commentId, userId, manager);
  }

  async unlikeComment(
    commentId: number,
    userId: number,
    manager: EntityManager,
  ): Promise<DeleteResult> {
    return await this.commentLikeRepository.unlikeComment(commentId, userId, manager);
  }
}
