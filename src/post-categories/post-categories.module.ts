import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostCategory } from './entities/post-category.entity';
import { PostCategoryController } from './post-categories.controller';
import { PostCategoryService } from './post-categories.service';
import { PostCategoryRepository } from './post-categories.repository';

@Module({
  imports: [TypeOrmModule.forFeature([PostCategory])],
  controllers: [PostCategoryController],
  providers: [PostCategoryService, PostCategoryRepository],
  exports: [PostCategoryService],
})
export class PostCategoryModule {}
