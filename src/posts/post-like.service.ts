import { Injectable } from '@nestjs/common';
import { PostLikeRepository } from './post-like.repository';
import { EntityManager } from 'typeorm';

@Injectable()
export class PostLikeService {
  constructor(private readonly postLikeRepository: PostLikeRepository) {}

  async likePost(postId: number, userId: number, manager: EntityManager) {
    return await this.postLikeRepository.saveLike(postId, userId, manager);
  }

  async unlikePost(postId: number, userId: number, manager: EntityManager) {
    return await this.postLikeRepository.deleteLike(postId, userId, manager);
  }

  async findPostLikeById(postId: number, userId: number) {
    return await this.postLikeRepository.findByUserIdAndPostId(postId, userId);
  }
}
