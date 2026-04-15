import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostLike } from './entities/post-like.entity';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class PostLikeRepository {
  constructor(
    @InjectRepository(PostLike)
    private readonly postLikeRepository: Repository<PostLike>,
  ) {}

  async saveLike(postId: number, userId: number, manager: EntityManager) {
    return await manager.save(PostLike, {
      post: { id: postId },
      user: { id: userId },
    });
  }

  async deleteLike(postId: number, userId: number, manager: EntityManager) {
    return await manager.delete(PostLike, {
      post: { id: postId },
      user: { id: userId },
    });
  }

  async findByUserIdAndPostId(postId: number, userId: number) {
    return await this.postLikeRepository.findOne({
      where: {
        post: { id: postId },
        user: { id: userId },
      },
      relations: {
        post: true,
        user: true,
      },
    });
  }
}
