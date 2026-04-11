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

@Injectable()
export class PostService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly postCategoryService: PostCategoryService,
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

  async findPostById(postId: number): Promise<ResponsePostDetailDto> {
    const post = await this.findPostByIdOrThrow(postId);
    return PostMapper.toDetailDto(post);
  }

  async updatePost(
    updatePostDto: UpdatePostDto,
    postId: number,
    userId: number,
  ): Promise<ResponsePostDetailDto> {
    const existingPost = await this.findPostByIdOrThrow(postId);

    await this.validatePost(updatePostDto, userId, existingPost.user.id);

    const updatePostPayload = this.buildUpdatePostPayload(updatePostDto);

    await this.postRepository.updatePost(postId, updatePostPayload);

    return await this.findPostById(postId);
  }

  private buildUpdatePostPayload(updatePostDto: UpdatePostDto): UpdatePostPayloadDto {
    const { categoryId, ...updatePostData } = updatePostDto;

    const updatePostPayload: UpdatePostPayloadDto = {
      ...updatePostData,
    };
    if (categoryId !== undefined) updatePostPayload.category = { id: categoryId };

    return updatePostPayload;
  }

  private async validatePost(
    updatePostDto: UpdatePostDto,
    currentUserId: number,
    authorId: number,
  ): Promise<void> {
    if (Object.keys(updatePostDto).length < 1)
      throw new BadRequestException('수정할 값이 없습니다.');

    if (authorId !== currentUserId)
      throw new ForbiddenException('게시글을 수정할 권한이 없습니다.');

    if (updatePostDto.categoryId !== undefined)
      await this.postCategoryService.findPostCategoryById(updatePostDto.categoryId);
  }

  private async findPostByIdOrThrow(postId: number): Promise<Post> {
    const post = await this.postRepository.findPostById(postId);

    if (!post) throw new NotFoundException('존재하지 않는 게시글입니다.');

    return post;
  }
}
