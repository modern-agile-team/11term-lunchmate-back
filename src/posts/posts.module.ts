import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post, PostLike])],
  controllers: [],
  providers: [],
})
export class PostModule {}
