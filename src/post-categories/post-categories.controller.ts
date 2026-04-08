import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PostCategoryService } from './post-categories.service';
import { PostCategory } from './entities/post-category.entity';

@ApiTags('Post Category')
@Controller('post-categories')
export class PostCategoryController {
  constructor(private readonly postCategoryService: PostCategoryService) {}

  @Get()
  @ApiOperation({ summary: '게시글 카테고리 조회' })
  @ApiOkResponse({ type: PostCategory, isArray: true })
  async findPostCategories(): Promise<PostCategory[]> {
    return await this.postCategoryService.findPostCategories();
  }
}
