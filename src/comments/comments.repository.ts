import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
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

  async updateComment(comment: Comment): Promise<Comment> {
    return await this.commentRepository.save(comment);
  }
}
