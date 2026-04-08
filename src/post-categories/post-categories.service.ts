import { Injectable } from '@nestjs/common';
import { PostCategoryRepository } from './post-categories.repository';
import { PostCategory } from './entities/post-category.entity';

@Injectable()
export class PostCategoryService {
  constructor(private readonly postCategoryRepository: PostCategoryRepository) {}

  async findPostCategories(): Promise<PostCategory[]> {
    return await this.postCategoryRepository.findPostCategories();
  }
}
