import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, MoreThan, Repository } from 'typeorm';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { Comment } from './entities/comment.entity';
import { UpdateResult } from 'typeorm';

@Injectable()
export class CommentRepository {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
  ) {}

  async createComment(
    createCommentDto: CreateCommentDto,
    postId: number,
    userId: number,
    manager: EntityManager,
  ): Promise<Comment> {
    return await manager.save(Comment, {
      ...createCommentDto,
      post: { id: postId },
      user: { id: userId },
    });
  }

  async findByCommentIdAndPostId(
    commentId: number,
    postId: number,
    manager?: EntityManager,
  ): Promise<Comment | null> {
    const findQuery = {
      where: { id: commentId, post: { id: postId } },
      relations: { user: true, post: true },
    };

    if (manager) return await manager.findOne(Comment, findQuery);
    else return await this.commentRepository.findOne(findQuery);
  }

  async findCommentsByPostId(
    postId: number,
    cursor: number | null,
    limit: number,
  ): Promise<Comment[]> {
    const where: FindOptionsWhere<Comment> = {};

    where.post = { id: postId };
    if (cursor) where.id = MoreThan(cursor);

    return await this.commentRepository.find({
      where,
      relations: { user: true },
      order: {
        id: 'ASC',
      },
      take: limit + 1,
    });
  }

  async updateComment(comment: Comment): Promise<Comment> {
    return await this.commentRepository.save(comment);
  }

  async deleteComment(commentId: number, manager: EntityManager): Promise<UpdateResult> {
    return await manager.softDelete(Comment, commentId);
  }

  async increaseCommentLikeCount(commentId: number, manager: EntityManager): Promise<UpdateResult> {
    return await manager.increment(Comment, { id: commentId }, 'likeCount', 1);
  }

  async decreaseCommentLikeCount(commentId: number, manager: EntityManager): Promise<UpdateResult> {
    return await manager.decrement(Comment, { id: commentId }, 'likeCount', 1);
  }
}
