import { User } from '../../users/entities/user.entity';
import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Post } from './post.entity';

@Entity('post_likes')
@Unique(['user', 'post'])
export class PostLike {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.postLikes)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Post, (post) => post.postLikes)
  @JoinColumn({ name: 'post_id' })
  post: Post;
}
