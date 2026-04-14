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
import { FindPostsResult } from './types/post.type';

@Injectable()
export class PostService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly postCategoryService: PostCategoryService,
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

  async findPostById(postId: number): Promise<Post> {
    const post = await this.postRepository.findPostById(postId);

    if (!post) throw new NotFoundException('존재하지 않는 게시글입니다.');

    return post;
  }

  async updatePost(updatePostDto: UpdatePostDto, postId: number, userId: number): Promise<Post> {
    const existingPost = await this.findPostById(postId);

    await this.validateUpdatePost(updatePostDto, userId, existingPost.user.id);

    const updatePostPayload = this.buildUpdatePostPayload(updatePostDto);

    await this.postRepository.updatePost(postId, updatePostPayload);

    return await this.findPostById(postId);
  }

  async deletePost(postId: number, userId: number): Promise<void> {
    await this.validateDeletePost(postId, userId);

    const deleteResult = await this.postRepository.deletePost(postId);

    if (!deleteResult.affected) throw new NotFoundException('존재하지 않는 게시글입니다.');
  }

  private buildUpdatePostPayload(updatePostDto: UpdatePostDto): UpdatePostPayloadDto {
    const { categoryId, ...updatePostData } = updatePostDto;

    const updatePostPayload: UpdatePostPayloadDto = {
      ...updatePostData,
    };
    if (categoryId !== undefined) updatePostPayload.category = { id: categoryId };

    return updatePostPayload;
  }

  private async validateDeletePost(postId: number, currentUserId: number): Promise<void> {
    const existingPost = await this.findPostById(postId);

    this.validatePostAuthor(currentUserId, existingPost.user.id);
  }

  private async validateUpdatePost(
    updatePostDto: UpdatePostDto,
    currentUserId: number,
    authorId: number,
  ): Promise<void> {
    this.validatePostAuthor(currentUserId, authorId);

    if (updatePostDto.categoryId !== undefined)
      await this.validateCategoryExists(updatePostDto.categoryId);
  }

  validatePostAuthor(currentUserId: number, authorId: number): void {
    if (authorId !== currentUserId) throw new ForbiddenException('게시글에 권한이 없습니다.');
  }

  private async validateCategoryExists(categoryId: number): Promise<void> {
    const existingCategory = await this.postCategoryService.findPostCategoryById(categoryId);

    if (!existingCategory) throw new BadRequestException('존재하지 않는 카테고리입니다.');
  }
}
