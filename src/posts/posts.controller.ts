import { CommentService } from './../comments/comments.service';
import {
  HttpCode,
  BadRequestException,
  Body,
  Controller,
  Get,
  Delete,
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
  ResponsePostViewCountDto,
} from './dtos/response-post.dto';
import { FindPostsQueryDto } from './dtos/find-posts-query.dto';
import { UpdatePostDto } from './dtos/update-post.dto';
import { ResponsePostLikeDto } from './dtos/response-post-like.dto';
import { CreateCommentDto } from 'src/comments/dtos/create-comment.dto';
import { PostMapper } from './mappers/post-mapper';
import { PostLikeMapper } from './mappers/post-like.mapper';
import { CommentMapper } from 'src/comments/mappers/comment.mapper';
import { ResponseCommentDto } from 'src/comments/dtos/response-comment.dto';
import { UpdateCommentDto } from 'src/comments/dtos/update-comment.dto';

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

  @Delete(':id')
  @HttpCode(204)
  @Authenticated()
  @ApiOperation({
    summary: '게시글 삭제',
  })
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
    const likedPost = await this.postService.createPostLike(postId, user.userId);

    return PostLikeMapper.toPostLikeDto(likedPost, true);
  }

  @Delete(':id/like')
  @Authenticated()
  @HttpCode(200)
  @ApiOperation({ summary: '게시글 좋아요 취소' })
  @ApiOkResponse({ type: ResponsePostLikeDto, description: '게시글 좋아요 취소 성공' })
  @ApiNotFoundResponse({
    description: '존재하지 않는 게시글이거나 좋아요하지 않은 게시글의 좋아요를 취소하려는 경우',
  })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  async unlikePost(
    @Param('id', ParseIntPipe) postId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponsePostLikeDto> {
    const unlikedPost = await this.postService.deletePostLike(postId, user.userId);

    return PostLikeMapper.toPostLikeDto(unlikedPost, false);
  }

  @Patch(':id/views')
  @ApiOperation({ summary: '게시글 조회수 증가' })
  @ApiOkResponse({ type: ResponsePostLikeDto, description: '게시글 조회수 증가 성공' })
  @ApiNotFoundResponse({
    description: '존재하지 않는 게시글의 조회수를 증가시키려는 경우',
  })
  async increaseViewCount(
    @Param('id', ParseIntPipe) postId: number,
  ): Promise<ResponsePostViewCountDto> {
    const increasedCount = await this.postService.increaseViewCount(postId);

    return {
      viewCount: increasedCount,
    };
  }

  // 댓글 엔드포인트
  @Post(':id/comments')
  @Authenticated()
  @ApiOperation({ summary: '게시글 댓글 작성' })
  @ApiCreatedResponse({ type: ResponseCommentDto, description: '댓글 작성 성공' })
  @ApiNotFoundResponse({
    description: '존재하지 않는 게시글에 댓글을 작성하려는 경우',
  })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  async createComment(
    @Body() createCommentDto: CreateCommentDto,
    @Param('id', ParseIntPipe) postId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponseCommentDto> {
    const createdComment = await this.commentService.createComment(
      createCommentDto,
      postId,
      user.userId,
    );

    return CommentMapper.toCommentDetailDto(createdComment);
  }

  @Patch(':postId/comments/:commentId')
  @Authenticated()
  @ApiOperation({ summary: '게시글 댓글 수정' })
  @ApiOkResponse({ type: ResponseCommentDto, description: '댓글 수정 성공' })
  @ApiNotFoundResponse({
    description: '삭제된 게시글의 댓글을 수정하거나 존재하지 않는 댓글을 수정하려는 경우',
  })
  @ApiForbiddenResponse({
    description: '다른 작성자의 댓글을 수정하려는 경우',
  })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  async editComment(
    @Body() updateCommentDto: UpdateCommentDto,
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (Object.keys(updateCommentDto).length < 1)
      throw new BadRequestException('수정할 값이 없습니다.');

    const updatedComment = await this.commentService.editComment(
      updateCommentDto,
      postId,
      commentId,
      user.userId,
    );

    return CommentMapper.toCommentDetailDto(updatedComment);
  }

  @Delete(':postId/comments/:commentId')
  @HttpCode(204)
  @Authenticated()
  @ApiOperation({ summary: '게시글 댓글 삭제' })
  @ApiNoContentResponse({ description: '댓글 삭제 성공' })
  @ApiNotFoundResponse({
    description: '삭제된 게시글의 댓글을 삭제하거나 존재하지 않는 댓글을 삭제하려는 경우',
  })
  @ApiForbiddenResponse({
    description: '다른 작성자의 댓글을 삭제하려는 경우',
  })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  async deleteComment(
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return await this.commentService.deleteComment(postId, commentId, user.userId);
  }
}
