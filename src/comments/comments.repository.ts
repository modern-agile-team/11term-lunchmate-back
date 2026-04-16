import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { Comment } from './entities/comment.entity';

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
  ) {
    return await manager.save(Comment, {
      ...createCommentDto,
      post: { id: postId },
      user: { id: userId },
    });
  }

  async findCommentById(commentId: number): Promise<Comment | null> {
    return await this.commentRepository.findOne({
      where: { id: commentId },
      relations: { user: true },
    });
  }
}
