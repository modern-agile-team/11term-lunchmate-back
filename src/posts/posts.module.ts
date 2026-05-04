import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostController } from './posts.controller';
import { PostService } from './posts.service';
import { PostRepository } from './posts.repository';
import { PostCategoryModule } from 'src/post-categories/post-categories.module';
import { PostLikeService } from './post-like.service';
import { PostLikeRepository } from './post-like.repository';
import { CommentModule } from 'src/comments/comments.module';

@Module({
  imports: [TypeOrmModule.forFeature([Post, PostLike]), PostCategoryModule, CommentModule],
  controllers: [PostController],
  providers: [PostService, PostRepository, PostLikeService, PostLikeRepository],
  exports: [PostService, PostRepository],
})
export class PostModule {}
