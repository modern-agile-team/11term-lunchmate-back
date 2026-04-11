import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { DeleteResult, FindOptionsWhere, LessThan, Repository, UpdateResult } from 'typeorm';
import { CreatePostDto } from './dtos/create-post.dto';
import { FindPostsQueryDto } from './dtos/find-posts-query.dto';
import { UpdatePostPayloadDto } from './dtos/update-post.dto';

@Injectable()
export class PostRepository {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async createPost(createPostDto: CreatePostDto, userId: number): Promise<Post> {
    return await this.postRepository.save({
      title: createPostDto.title,
      content: createPostDto.content,
      isAnonymous: createPostDto.isAnonymous,
      category: { id: createPostDto.categoryId },
      user: { id: userId },
    });
  }

  async findPostById(postId: number): Promise<Post | null> {
    return await this.postRepository.findOne({
      where: {
        id: postId,
      },
      relations: {
        category: true,
        user: true,
      },
    });
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

  async updatePost(postId: number, updatePostPayload: UpdatePostPayloadDto): Promise<UpdateResult> {
    return await this.postRepository.update(postId, updatePostPayload);
  }

  async deletePost(postId: number): Promise<DeleteResult> {
    return await this.postRepository.softDelete(postId);
  }
}
