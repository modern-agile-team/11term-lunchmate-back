import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostRepository } from './posts.repository';
import { CreatePostDto } from './dtos/create-post.dto';
import { PostCategoryService } from 'src/post-categories/post-categories.service';
import { FindPostsQueryDto } from './dtos/find-posts-query.dto';
import { PAGINATION_CONSTANTS } from './constants/post.constant';
import { Post } from './entities/post.entity';
import { UpdatePostDto, UpdatePostPayloadDto } from './dtos/update-post.dto';
import { DataSource, EntityManager } from 'typeorm';
import { PostLikeService } from './post-like.service';
import { FindPostsResult } from './types/post.type';

@Injectable()
export class PostService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly postCategoryService: PostCategoryService,
    private readonly postLikeService: PostLikeService,
    private readonly dataSource: DataSource,
  ) {}

  async createPost(createPostDto: CreatePostDto, userId: number): Promise<Post> {
    const categoryId = createPostDto.categoryId;

    await this.validateCategoryExists(categoryId);

    const createdPost = await this.postRepository.createPost(createPostDto, userId);

    const createdPostDetail = await this.postRepository.findPostById(createdPost.id);

    if (!createdPostDetail) throw new NotFoundException('생성된 게시글을 찾을 수 없습니다.');

    return createdPostDetail;
  }

  async findPosts(findPostsQuery: FindPostsQueryDto): Promise<FindPostsResult> {
    if (findPostsQuery.categoryId !== undefined)
      await this.validateCategoryExists(findPostsQuery.categoryId);

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

  async findPostById(postId: number, manager?: EntityManager): Promise<Post> {
    const post = await this.postRepository.findPostById(postId, manager);

    if (!post) throw new NotFoundException('존재하지 않는 게시글입니다.');

    return post;
  }

  async updatePost(updatePostDto: UpdatePostDto, postId: number, userId: number): Promise<Post> {
    const existingPost = await this.findPostById(postId);

    if (userId !== existingPost.user.id)
      throw new ForbiddenException('게시글에 대한 권한이 없습니다.');

    if (updatePostDto.categoryId !== undefined)
      await this.validateCategoryExists(updatePostDto.categoryId);

    const updatePostPayload = this.buildUpdatePostPayload(updatePostDto);

    await this.postRepository.updatePost(postId, updatePostPayload);

    return await this.findPostById(postId);
  }

  async deletePost(postId: number, userId: number): Promise<void> {
    const existingPost = await this.findPostById(postId);

    if (userId !== existingPost.user.id)
      throw new ForbiddenException('게시글에 대한 권한이 없습니다.');

    const deleteResult = await this.postRepository.deletePost(postId);

    if (!deleteResult.affected) throw new NotFoundException('존재하지 않는 게시글입니다.');
  }

  async createPostLike(postId: number, userId: number): Promise<Post> {
    await this.findPostById(postId);

    const existingPostLike = await this.postLikeService.findPostLikeById(postId, userId);
    if (existingPostLike) throw new BadRequestException('이미 좋아요한 게시글입니다.');

    return await this.dataSource.transaction(async (manager) => {
      await this.postLikeService.saveLike(postId, userId, manager);

      await this.postRepository.increasePostLikeCount(postId, manager);

      return await this.findPostById(postId, manager);
    });
  }

  async deletePostLike(postId: number, userId: number): Promise<Post> {
    await this.findPostById(postId);

    const existingPostLike = await this.postLikeService.findPostLikeById(postId, userId);
    if (!existingPostLike) throw new NotFoundException('좋아요하지 않은 게시글입니다.');

    return await this.dataSource.transaction(async (manager) => {
      const deleteResult = await this.postLikeService.deleteLike(postId, userId, manager);

      if (!deleteResult.affected) throw new NotFoundException('좋아요하지 않은 게시글입니다.');

      await this.postRepository.decreasePostLikeCount(postId, manager);

      return await this.findPostById(postId, manager);
    });
  }

  private buildUpdatePostPayload(updatePostDto: UpdatePostDto): UpdatePostPayloadDto {
    const { categoryId, ...updatePostData } = updatePostDto;

    const updatePostPayload: UpdatePostPayloadDto = {
      ...updatePostData,
    };
    if (categoryId !== undefined) updatePostPayload.category = { id: categoryId };

    return updatePostPayload;
  }

  private async validateCategoryExists(categoryId: number): Promise<void> {
    const existingCategory = await this.postCategoryService.findPostCategoryById(categoryId);

    if (!existingCategory) throw new BadRequestException('존재하지 않는 카테고리입니다.');
  }
}
