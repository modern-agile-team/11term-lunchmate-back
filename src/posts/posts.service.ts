import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostRepository } from './posts.repository';
import { CreatePostDto } from './dtos/create-post.dto';
import { PostCategoryService } from 'src/post-categories/post-categories.service';
import { ResponsePostDetailDto, ResponsePostListDto } from './dtos/response-post.dto';
import { PostMapper } from './mappers/post-mapper';
import { FindPostsQueryDto } from './dtos/find-posts-query.dto';
import { PAGINATION_CONSTANTS } from './constants/post.constant';
import { Post } from './entities/post.entity';
import { UpdatePostDto, UpdatePostPayloadDto } from './dtos/update-post.dto';
import { DataSource, EntityManager } from 'typeorm';
import { PostLikeService } from './post-like.service';
import { PostLikeMapper } from './mappers/post-like.mapper';
import { ResponsePostLikeDto } from './dtos/response-post-like.dto';

@Injectable()
export class PostService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly postCategoryService: PostCategoryService,
    private readonly postLikeService: PostLikeService,
    private readonly dataSource: DataSource,
  ) {}

  async createPost(createPostDto: CreatePostDto, userId: number): Promise<ResponsePostDetailDto> {
    const categoryId = createPostDto.categoryId;

    await this.postCategoryService.findPostCategoryById(categoryId);

    const createdPost = await this.postRepository.createPost(createPostDto, userId);

    const createdPostDetail = await this.postRepository.findPostById(createdPost.id);

    if (!createdPostDetail) throw new NotFoundException('생성된 게시글을 찾을 수 없습니다.');

    return PostMapper.toDetailDto(createdPostDetail);
  }

  async findPosts(findPostsQuery: FindPostsQueryDto): Promise<ResponsePostListDto> {
    if (findPostsQuery.categoryId !== undefined)
      await this.postCategoryService.findPostCategoryById(findPostsQuery.categoryId);

    const limit = findPostsQuery.limit ?? PAGINATION_CONSTANTS.DEFAULT_LIMIT;
    const posts = await this.postRepository.findPosts(findPostsQuery, limit);
    const hasNext = posts.length > limit;
    const paginatedPosts = hasNext ? posts.slice(0, limit) : posts;
    const nextCursor = hasNext ? paginatedPosts[paginatedPosts.length - 1].id : null;

    return PostMapper.toListDto(paginatedPosts, nextCursor, hasNext);
  }

  async findPostDetailAndIncreaseViewCount(postId: number): Promise<ResponsePostDetailDto> {
    await this.increasePostViewCount(postId);

    const increasedPost = await this.findPostByIdOrThrow(postId);

    return PostMapper.toDetailDto(increasedPost);
  }

  async updatePost(
    updatePostDto: UpdatePostDto,
    postId: number,
    userId: number,
  ): Promise<ResponsePostDetailDto> {
    const existingPost = await this.findPostByIdOrThrow(postId);

    await this.validateUpdatePost(updatePostDto, userId, existingPost.user.id);

    const updatePostPayload = this.buildUpdatePostPayload(updatePostDto);

    await this.postRepository.updatePost(postId, updatePostPayload);

    const updatedPost = await this.findPostByIdOrThrow(postId);

    return PostMapper.toDetailDto(updatedPost);
  }

  async deletePost(postId: number, userId: number): Promise<void> {
    await this.validateDeletePost(postId, userId);

    const deleteResult = await this.postRepository.deletePost(postId);

    if (!deleteResult.affected) throw new NotFoundException('존재하지 않는 게시글입니다.');
  }

  async createPostLike(postId: number, userId: number): Promise<ResponsePostLikeDto> {
    const existingPost = await this.findPostByIdOrThrow(postId);

    if (existingPost.user.id === userId)
      throw new BadRequestException('자신의 게시글에는 좋아요할 수 없습니다.');

    const existingPostLike = await this.postLikeService.findPostLikeById(postId, userId);
    if (existingPostLike) throw new BadRequestException('이미 좋아요한 게시글입니다.');

    return await this.likePostTransaction(postId, userId);
  }

  async deletePostLike(postId: number, userId: number): Promise<ResponsePostLikeDto> {
    await this.findPostByIdOrThrow(postId);

    const existingPostLike = await this.postLikeService.findPostLikeById(postId, userId);
    if (!existingPostLike) throw new NotFoundException('좋아요하지 않은 게시글입니다.');

    return await this.unlikePostTransaction(postId, userId);
  }

  async likePostTransaction(postId: number, userId: number): Promise<ResponsePostLikeDto> {
    const post = await this.dataSource.transaction(async (manager) => {
      await this.postLikeService.saveLike(postId, userId, manager);

      await this.postRepository.increasePostLikeCount(postId, manager);

      return await this.findPostByIdOrThrow(postId, manager);
    });

    return PostLikeMapper.toPostLikeDto(post, true);
  }

  async unlikePostTransaction(postId: number, userId: number): Promise<ResponsePostLikeDto> {
    const post = await this.dataSource.transaction(async (manager) => {
      const deleteResult = await this.postLikeService.deleteLike(postId, userId, manager);

      if (!deleteResult.affected) throw new NotFoundException('좋아요하지 않은 게시글입니다.');

      await this.postRepository.decreasePostLikeCount(postId, manager);

      return await this.findPostByIdOrThrow(postId, manager);
    });

    return PostLikeMapper.toPostLikeDto(post, false);
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
    const existingPost = await this.findPostByIdOrThrow(postId);

    this.validatePostAuthor(currentUserId, existingPost.user.id);
  }

  private async validateUpdatePost(
    updatePostDto: UpdatePostDto,
    currentUserId: number,
    authorId: number,
  ): Promise<void> {
    this.validatePostAuthor(currentUserId, authorId);

    if (Object.keys(updatePostDto).length < 1)
      throw new BadRequestException('수정할 값이 없습니다.');

    if (updatePostDto.categoryId !== undefined)
      await this.postCategoryService.findPostCategoryById(updatePostDto.categoryId);
  }

  validatePostAuthor(currentUserId: number, authorId: number): void {
    if (authorId !== currentUserId) throw new ForbiddenException('게시글에 대한 권한이 없습니다.');
  }

  private async findPostByIdOrThrow(postId: number, manager?: EntityManager): Promise<Post> {
    const post = await this.postRepository.findPostById(postId, manager);

    if (!post) throw new NotFoundException('존재하지 않는 게시글입니다.');

    return post;
  }

  private async increasePostViewCount(postId: number): Promise<void> {
    await this.findPostByIdOrThrow(postId);

    await this.postRepository.increaseViewCount(postId);
  }
}
