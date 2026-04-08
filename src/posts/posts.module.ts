import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostController } from './posts.controller';
import { PostService } from './posts.service';
import { PostRepository } from './posts.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Post, PostLike])],
  controllers: [PostController],
  providers: [PostService, PostRepository],
})
export class PostModule {}
