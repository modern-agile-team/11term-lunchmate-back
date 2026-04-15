import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PostRepository } from './posts.repository';
import { CreatePostDto } from './dtos/create-post.dto';
import { PostCategoryService } from 'src/post-categories/post-categories.service';
import { ResponsePostDetailDto } from './dtos/response-post.dto';
import { PostMapper } from './mappers/post-mapper';

@Injectable()
export class PostService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly postCategoryService: PostCategoryService,
  ) {}

  async createPost(createPostDto: CreatePostDto, userId: number): Promise<ResponsePostDetailDto> {
    const categoryId = createPostDto.categoryId;

    const existingCategory = await this.postCategoryService.findPostCategoryById(categoryId);
    if (!existingCategory) throw new BadRequestException('존재하지 않는 카테고리입니다.');

    const createdPost = await this.postRepository.createPost(createPostDto, userId);

    const post = await this.postRepository.findPostById(createdPost.id);

    if (!post) throw new NotFoundException('생성된 게시글을 찾을 수 없습니다.');

    return PostMapper.toDetailDto(post);
  }
}
