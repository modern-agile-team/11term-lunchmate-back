import { CommentService } from './../comments/comments.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
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
import { ResponsePostLikeDto } from './dtos/response-post-like.dto';
import { CreateCommentDto } from 'src/comments/dtos/create-comment.dto';

@ApiTags('Post')
@ApiExtraModels(ResponsePostDetailDto, ResponsePostListDto, ResponsePostListItemDto)
@Controller('posts')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly commentService: CommentService,
  ) {}

  @Authenticated()
  @Post()
  @ApiOperation({ summary: '게시글 작성' })
  @ApiCreatedResponse({ type: ResponsePostDetailDto })
  @ApiBadRequestResponse({ description: '게시글 작성 요청 값이 올바르지 않은 경우' })
  @ApiNotFoundResponse({ description: '존재하지 않는 카테고리로 게시글을 작성하려는 경우' })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  async createPost(
    @Body() createPostDto: CreatePostDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponsePostDetailDto> {
    return await this.postService.createPost(createPostDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: '게시글 목록 조회' })
  @ApiQuery({ name: 'cursor', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiOkResponse({ type: ResponsePostListDto })
  @ApiBadRequestResponse({ description: '조회 조건이 올바르지 않은 경우' })
  @ApiNotFoundResponse({ description: '존재하지 않는 카테고리로 조회하려는 경우' })
  async findPosts(@Query() query: FindPostsQueryDto): Promise<ResponsePostListDto> {
    return await this.postService.findPosts(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '게시글 상세 조회' })
  @ApiParam({ name: 'id', description: '조회할 게시글 ID', type: Number })
  @ApiOkResponse({ type: ResponsePostDetailDto })
  @ApiNotFoundResponse({ description: '존재하지 않는 게시글을 조회하려는 경우' })
  async findPostDetailAndIncreaseViewCount(
    @Param('id', ParseIntPipe) postId: number,
  ): Promise<ResponsePostDetailDto> {
    return await this.postService.findPostDetailAndIncreaseViewCount(postId);
  }

  @Patch(':id')
  @Authenticated()
  @ApiOperation({ summary: '게시글 수정' })
  @ApiParam({ name: 'id', description: '수정할 게시글 ID', type: Number })
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
    return await this.postService.updatePost(updatePostDto, postId, user.userId);
  }

  @Delete(':id')
  @HttpCode(204)
  @Authenticated()
  @ApiOperation({
    summary: '게시글 삭제',
  })
  @ApiParam({ name: 'id', description: '삭제할 게시글 ID', type: Number })
  @ApiNoContentResponse({ description: '게시글 삭제 성공, 응답 본문은 반환되지 않음' })
  @ApiForbiddenResponse({ description: '작성자가 아닌 사용자가 삭제를 시도한 경우' })
  @ApiNotFoundResponse({ description: '존재하지 않는 게시글을 삭제하려는 경우' })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  async deletePost(
    @Param('id', ParseIntPipe) postId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return await this.postService.deletePost(postId, user.userId);
  }

  @Post(':id/like')
  @Authenticated()
  @ApiOperation({ summary: '게시글 좋아요' })
  @ApiParam({ name: 'id', description: '좋아요할 게시글 ID', type: Number })
  @ApiCreatedResponse({ type: ResponsePostLikeDto, description: '게시글 좋아요 성공' })
  @ApiBadRequestResponse({
    description: '자신의 게시글에 좋아요하거나 이미 좋아요한 게시글인 경우',
  })
  @ApiNotFoundResponse({ description: '존재하지 않는 게시글에 좋아요하려는 경우' })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  async likePost(
    @Param('id', ParseIntPipe) postId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponsePostLikeDto> {
    return await this.postService.createPostLike(postId, user.userId);
  }

  @Delete(':id/like')
  @Authenticated()
  @HttpCode(200)
  @ApiOperation({ summary: '게시글 좋아요 취소' })
  @ApiParam({ name: 'id', description: '좋아요 취소할 게시글 ID', type: Number })
  @ApiOkResponse({ type: ResponsePostLikeDto, description: '게시글 좋아요 취소 성공' })
  @ApiNotFoundResponse({
    description: '존재하지 않는 게시글이거나 좋아요하지 않은 게시글의 좋아요를 취소하려는 경우',
  })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  async unlikePost(
    @Param('id', ParseIntPipe) postId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponsePostLikeDto> {
    return await this.postService.deletePostLike(postId, user.userId);
  }

  // 댓글 엔드포인트
  @Post(':id/comments')
  @Authenticated()
  async createComment(
    @Body() createCommentDto: CreateCommentDto,
    @Param('id', ParseIntPipe) postId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.commentService.createComment(createCommentDto, postId, user.userId);
  }
}
