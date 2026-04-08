import { Injectable } from '@nestjs/common';
import { PostCategoryRepository } from './post-categories.repository';
import { PostCategory } from './entities/post-category.entity';

@Injectable()
export class PostCategoryService {
  constructor(private readonly postCategoryRepository: PostCategoryRepository) {}

  async findCategories(): Promise<PostCategory[]> {
    return await this.postCategoryRepository.findCategories();
  }
}
