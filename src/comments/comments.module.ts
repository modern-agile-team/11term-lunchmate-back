import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';
import { CommentLike } from './entities/comment-like.entity';
import { CommentService } from './comments.service';
import { CommentRepository } from './comments.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, CommentLike])],
  controllers: [],
  providers: [CommentService, CommentRepository],
})
export class CommentModule {}
