import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PostService } from './posts.service';
import { CreatePostDto } from './dtos/create-post.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/interfaces/jwt-payload.interface';
import { Authenticated } from 'src/auth/decorators/authenticated.decorator';
import {
  ResponsePostDetailDto,
  ResponsePostListDto,
  ResponsePostListItemDto,
} from './dtos/response-post.dto';
import { FindPostsQueryDto } from './dtos/find-posts-query.dto';
import { UpdatePostDto } from './dtos/update-post.dto';
import { PostMapper } from './mappers/post-mapper';

@ApiTags('Post')
@ApiExtraModels(ResponsePostDetailDto, ResponsePostListDto, ResponsePostListItemDto)
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Authenticated()
  @Post()
  @ApiOperation({ summary: '게시글 작성' })
  @ApiCreatedResponse({ type: ResponsePostDetailDto })
  @ApiBadRequestResponse({ description: '게시글 작성 요청 값이 올바르지 않은 경우' })
  @ApiBadRequestResponse({ description: '존재하지 않는 카테고리로 게시글을 작성하려는 경우' })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  async createPost(
    @Body() createPostDto: CreatePostDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponsePostDetailDto> {
    const createdPost = await this.postService.createPost(createPostDto, user.userId);

    return PostMapper.toDetailDto(createdPost);
  }

  @Get()
  @ApiOperation({ summary: '게시글 목록 조회' })
  @ApiOkResponse({ type: ResponsePostListDto })
  @ApiBadRequestResponse({ description: '조회 조건이 올바르지 않은 경우' })
  @ApiNotFoundResponse({ description: '존재하지 않는 카테고리로 조회하려는 경우' })
  async findPosts(@Query() query: FindPostsQueryDto): Promise<ResponsePostListDto> {
    const { items, nextCursor, hasNext } = await this.postService.findPosts(query);

    return PostMapper.toListDto(items, nextCursor, hasNext);
  }

  @Get(':id')
  @ApiOperation({ summary: '게시글 상세 조회' })
  @ApiOkResponse({ type: ResponsePostDetailDto })
  @ApiNotFoundResponse({ description: '존재하지 않는 게시글을 조회하려는 경우' })
  async findPostById(@Param('id', ParseIntPipe) postId: number): Promise<ResponsePostDetailDto> {
    const post = await this.postService.findPostById(postId);

    return PostMapper.toDetailDto(post);
  }

  @Patch(':id')
  @Authenticated()
  @ApiOperation({ summary: '게시글 수정' })
  @ApiBody({ type: UpdatePostDto })
  @ApiOkResponse({ type: ResponsePostDetailDto })
  @ApiBadRequestResponse({ description: '수정 요청 값이 올바르지 않거나 수정할 값이 없는 경우' })
  @ApiForbiddenResponse({ description: '작성자가 아닌 사용자가 수정을 시도한 경우' })
  @ApiNotFoundResponse({
    description: '존재하지 않는 게시글 또는 카테고리로 수정을 시도한 경우',
  })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  async updatePost(
    @Param('id', ParseIntPipe) postId: number,
    @Body() updatePostDto: UpdatePostDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponsePostDetailDto> {
    if (Object.keys(updatePostDto).length < 1)
      throw new BadRequestException('수정할 값이 없습니다.');

    const updatedPost = await this.postService.updatePost(updatePostDto, postId, user.userId);

    return PostMapper.toDetailDto(updatedPost);
  }
}
