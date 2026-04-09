import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { Repository } from 'typeorm';
import { CreatePostDto } from './dtos/create-post.dto';

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
}
