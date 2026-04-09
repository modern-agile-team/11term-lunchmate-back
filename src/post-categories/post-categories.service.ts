import { Injectable, NotFoundException } from '@nestjs/common';
import { PostCategoryRepository } from './post-categories.repository';
import { PostCategory } from './entities/post-category.entity';

@Injectable()
export class PostCategoryService {
  constructor(private readonly postCategoryRepository: PostCategoryRepository) {}

  async findPostCategories(): Promise<PostCategory[]> {
    return await this.postCategoryRepository.findPostCategories();
  }

  async findPostCategoryById(categoryId: number): Promise<PostCategory> {
    const category = await this.postCategoryRepository.findPostCategoryById(categoryId);
    if (!category) throw new NotFoundException('존재하지 않은 카테고리입니다.');

    return category;
  }
}
