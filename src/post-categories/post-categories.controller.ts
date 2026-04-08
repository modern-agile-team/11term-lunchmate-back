import { Controller, Get } from '@nestjs/common';
import { PostCategoryService } from './post-categories.service';
import { PostCategory } from './entities/post-category.entity';

@Controller('post-categories')
export class PostCategoryController {
  constructor(private readonly postCategoryService: PostCategoryService) {}

  @Get()
  async findCategories(): Promise<PostCategory[]> {
    return await this.postCategoryService.findCategories();
  }
}
