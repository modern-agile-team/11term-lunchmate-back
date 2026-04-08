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

  async findCategories(): Promise<PostCategory[]> {
    return await this.postCategoryRepository.find();
  }
}
