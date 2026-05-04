import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import {
  DeleteResult,
  EntityManager,
  FindOptionsWhere,
  LessThan,
  Repository,
  UpdateResult,
} from 'typeorm';
import { FindPostsQueryDto } from './dtos/find-posts-query.dto';
import { CreatePostProps, UpdatePostProps } from './types/post.type';

@Injectable()
export class PostRepository {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async createPost(createPostProps: CreatePostProps): Promise<Post> {
    return await this.postRepository.save(createPostProps);
  }

  async findPostById(postId: number, manager?: EntityManager): Promise<Post | null> {
    const findQuery = {
      where: {
        id: postId,
      },
      relations: {
        category: true,
        user: true,
      },
    };

    if (manager) return await manager.findOne(Post, findQuery);
    else return await this.postRepository.findOne(findQuery);
  }

  async findPosts(query: FindPostsQueryDto, limit: number): Promise<Post[]> {
    const where: FindOptionsWhere<Post> = {};

    if (query.categoryId !== undefined) where.category = { id: query.categoryId };
    if (query.cursor !== undefined) where.id = LessThan(query.cursor);

    return await this.postRepository.find({
      where,
      relations: {
        user: true,
        category: true,
      },
      order: {
        id: 'DESC',
      },
      take: limit + 1,
    });
  }

  async updatePost(postId: number, updatePostProps: UpdatePostProps): Promise<UpdateResult> {
    return await this.postRepository.update(postId, updatePostProps);
  }

  async deletePost(postId: number): Promise<DeleteResult> {
    return await this.postRepository.softDelete(postId);
  }

  async increasePostLikeCount(postId: number, manager: EntityManager): Promise<UpdateResult> {
    return await manager.increment(Post, { id: postId }, 'likeCount', 1);
  }

  async decreasePostLikeCount(postId: number, manager: EntityManager): Promise<UpdateResult> {
    return await manager.decrement(Post, { id: postId }, 'likeCount', 1);
  }

  async increaseViewCount(postId: number): Promise<UpdateResult> {
    return await this.postRepository.increment({ id: postId }, 'viewCount', 1);
  }

  async increaseCommentCount(postId: number, manager: EntityManager): Promise<UpdateResult> {
    return await manager.increment(Post, { id: postId }, 'commentCount', 1);
  }

  async decreaseCommentCount(postId: number, manager: EntityManager): Promise<UpdateResult> {
    return await manager.decrement(Post, { id: postId }, 'commentCount', 1);
  }
}
