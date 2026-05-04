import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommentLike } from './entities/comment-like.entity';
import { DeleteResult, EntityManager, Repository } from 'typeorm';

@Injectable()
export class CommentLikeRepository {
  constructor(
    @InjectRepository(CommentLike)
    private readonly commentLikeRepository: Repository<CommentLike>,
  ) {}

  async findByCommentIdAndUserId(commentId: number, userId: number): Promise<CommentLike | null> {
    return await this.commentLikeRepository.findOne({
      where: {
        comment: { id: commentId },
        user: { id: userId },
      },
    });
  }

  async likeComment(
    commentId: number,
    userId: number,
    manager: EntityManager,
  ): Promise<CommentLike> {
    return await manager.save(CommentLike, {
      comment: { id: commentId },
      user: { id: userId },
    });
  }

  async unlikeComment(
    commentId: number,
    userId: number,
    manager: EntityManager,
  ): Promise<DeleteResult> {
    return await manager.delete(CommentLike, {
      comment: { id: commentId },
      user: { id: userId },
    });
  }
}
