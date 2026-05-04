import { User } from '../../users/entities/user.entity';
import { Comment } from './comment.entity';
import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('comment_likes')
@Unique(['user', 'comment'])
export class CommentLike {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.commentLikes)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Comment, (comment) => comment.commentLikes)
  @JoinColumn({ name: 'comment_id' })
  comment: Comment;
}
