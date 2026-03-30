import { CommentLike } from '../../comments/entities/comment-like.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { BaseTableEntity } from '../../commons/entities/base.entity';
import { Friend } from '../../friends/entities/friend.entity';
import { MealMenuReaction } from '../../meal-menus/entities/meal-menu-reaction.entity';
import { PostLike } from '../../posts/entities/post-like.entity';
import { Post } from '../../posts/entities/post.entity';
import { RoomMember } from '../../rooms/entities/room-member.entity';
import { Room } from '../../rooms/entities/room.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User extends BaseTableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
    length: 100,
  })
  email: string;

  @Column({
    unique: true,
    length: 50,
  })
  nickname: string;

  @Column({
    length: 100,
  })
  name: string;

  @Column({ name: 'hashed_password', select: false })
  hashedPassword: string;

  @Column({
    type: 'varchar',
    nullable: true,
    name: 'profile_image_url',
    length: 500,
  })
  profileImageUrl: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  bio: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
    length: 4,
  })
  mbti: string | null;

  @Column({
    type: 'varchar',
    name: 'refresh_token_hash',
    nullable: true,
    select: false,
  })
  refreshTokenHash: string | null;

  @Column({
    type: 'integer',
    name: 'token_version',
    default: 0,
    select: false,
  })
  tokenVersion: number;

  @OneToMany(() => Friend, (friend) => friend.requester)
  sentFriendRequests: Friend[];

  @OneToMany(() => Friend, (friend) => friend.receiver)
  receivedFriendRequests: Friend[];

  @OneToMany(() => Post, (post) => post.user)
  posts: Post[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @OneToMany(() => PostLike, (postLike) => postLike.user)
  postLikes: PostLike[];

  @OneToMany(() => Room, (room) => room.user)
  rooms: Room[];

  @OneToMany(() => RoomMember, (roomMember) => roomMember.user)
  roomMembers: RoomMember[];

  @OneToMany(() => CommentLike, (commentLike) => commentLike.user)
  commentLikes: CommentLike[];

  @OneToMany(() => MealMenuReaction, (mealMenuReaction) => mealMenuReaction.user)
  reactions: MealMenuReaction[];
}
