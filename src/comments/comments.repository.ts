import { UpdateCommentDto } from './dtos/update-comment.dto';
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

  async findByCommentIdAndPostId(commentId: number, postId: number): Promise<Comment | null> {
    return await this.commentRepository.findOne({
      where: { id: commentId, post: { id: postId } },
      relations: { user: true, post: true },
    });
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

  async updateComment(
    updateCommentDto: UpdateCommentDto,
    commentId: number,
  ): Promise<UpdateResult> {
    return await this.commentRepository.update(commentId, updateCommentDto);
  }

  async deleteComment(commentId: number, manager: EntityManager): Promise<UpdateResult> {
    return await manager.softDelete(Comment, commentId);
  }
}
