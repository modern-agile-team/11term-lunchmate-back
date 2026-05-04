import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';
import { CommentLike } from './entities/comment-like.entity';
import { CommentService } from './comments.service';
import { CommentRepository } from './comments.repository';
import { Post } from 'src/posts/entities/post.entity';
import { PostRepository } from 'src/posts/posts.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, CommentLike, Post])],
  controllers: [],
  providers: [CommentService, CommentRepository, PostRepository],
  exports: [CommentService],
})
export class CommentModule {}
