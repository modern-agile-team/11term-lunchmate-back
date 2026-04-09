import { BaseTableEntity } from '../../commons/entities/base.entity';
import { PostCategory } from '../../post-categories/entities/post-category.entity';
import { User } from '../../users/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Comment } from '../../comments/entities/comment.entity';
import { PostLike } from './post-like.entity';

@Entity('posts')
export class Post extends BaseTableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 150,
  })
  title: string;

  @Column({
    type: 'text',
  })
  content: string;

  @Column({
    default: 0,
    name: 'view_count',
  })
  viewCount: number;

  @Column({
    default: 0,
    name: 'like_count',
  })
  likeCount: number;

  @Column({
    default: 0,
    name: 'comment_count',
  })
  commentCount: number;

  @Column({
    default: false,
    name: 'is_anonymous',
  })
  isAnonymous: boolean;

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @ManyToOne(() => User, (user) => user.posts)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => PostCategory, (postCategory) => postCategory.posts)
  @JoinColumn({ name: 'category_id' })
  category: PostCategory;

  @OneToMany(() => PostLike, (postLike) => postLike.post)
  postLikes: PostLike[];
}
