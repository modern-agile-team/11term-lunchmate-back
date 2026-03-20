import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostCategory } from './entities/post-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PostCategory])],
  controllers: [],
  providers: [],
})
export class PostCategoryModule {}
