import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PostRepository } from './posts.repository';
import { CreatePostDto } from './dtos/create-post.dto';
import { PostCategoryService } from 'src/post-categories/post-categories.service';
import { FindPostsQueryDto } from './dtos/find-posts-query.dto';
import { PAGINATION_CONSTANTS } from './constants/post.constant';
import { Post } from './entities/post.entity';
import { FindPostsResult } from './types/post.type';

@Injectable()
export class PostService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly postCategoryService: PostCategoryService,
  ) {}

  async createPost(createPostDto: CreatePostDto, userId: number): Promise<Post> {
    const categoryId = createPostDto.categoryId;

    const existingCategory = await this.postCategoryService.findPostCategoryById(categoryId);
    if (!existingCategory) throw new BadRequestException('존재하지 않는 카테고리입니다.');

    const createdPost = await this.postRepository.createPost(createPostDto, userId);

    const newPostDetail = await this.postRepository.findPostById(createdPost.id);

    if (!newPostDetail) throw new NotFoundException('생성된 게시글을 찾을 수 없습니다.');

    return newPostDetail;
  }

  async findPosts(findPostsQuery: FindPostsQueryDto): Promise<FindPostsResult> {
    if (findPostsQuery.categoryId !== undefined)
      await this.postCategoryService.findPostCategoryById(findPostsQuery.categoryId);

    const limit = findPostsQuery.limit ?? PAGINATION_CONSTANTS.DEFAULT_LIMIT;
    const posts = await this.postRepository.findPosts(findPostsQuery, limit);
    const hasNext = posts.length > limit;
    const paginatedPosts = hasNext ? posts.slice(0, limit) : posts;
    const nextCursor = hasNext ? paginatedPosts[paginatedPosts.length - 1].id : null;

    return {
      items: paginatedPosts,
      nextCursor,
      hasNext,
    };
  }

  async findPostById(postId: number): Promise<Post> {
    const post = await this.postRepository.findPostById(postId);

    if (!post) throw new NotFoundException('존재하지 않는 게시글입니다.');

    return post;
  }
}
