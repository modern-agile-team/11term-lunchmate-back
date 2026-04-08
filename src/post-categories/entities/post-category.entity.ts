import { Post } from '../../posts/entities/post.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('post_categories')
export class PostCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 50,
    unique: true,
  })
  name: string;

  @OneToMany(() => Post, (post) => post.category)
  posts: Post[];
}
