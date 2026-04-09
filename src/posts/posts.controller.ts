import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PostService } from './posts.service';
import { CreatePostDto } from './dtos/create-post.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/interfaces/jwt-payload.interface';
import { Authenticated } from 'src/auth/decorators/authenticated.decorator';
import { ResponsePostDetailDto } from './dtos/response-post.dto';

@ApiTags('Post')
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

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
}
