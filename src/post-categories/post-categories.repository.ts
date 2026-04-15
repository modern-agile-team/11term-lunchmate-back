import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostCategory } from './entities/post-category.entity';

@Injectable()
export class PostCategoryRepository {
  constructor(
    @InjectRepository(PostCategory)
    private readonly postCategoryRepository: Repository<PostCategory>,
  ) {}

  async findPostCategories(): Promise<PostCategory[]> {
    return await this.postCategoryRepository.find({
      order: {
        id: 'ASC',
      },
    });
  }

  async findPostCategoryById(categoryId: number): Promise<PostCategory | null> {
    return await this.postCategoryRepository.findOne({
      where: {
        id: categoryId,
      },
    });
  }
}
