import { CommentLike } from '../../comments/entities/comment-like.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { BaseTableEntity } from '../../commons/entities/base.entity';
import { Friend } from '../../friends/entities/friend.entity';
import { LunchMenuReaction } from '../../lunchMenus/entities/lunch-menu-reaction.entity';
import { PostLike } from '../../posts/entities/post-like.entity';
import { Post } from '../../posts/entities/post.entity';
import { RoomMember } from '../../rooms/entities/room-member.entity';
import { Room } from '../../rooms/entities/room.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

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

  @Column({ name: 'hashed_password', select: false })
  hashedPassword: string;

  @Column({ type: 'date', name: 'birth_date' })
  birthDate: Date;

  @Column({
    type: 'enum',
    enum: Gender,
  })
  gender: Gender;

  @Column({
    length: 100,
  })
  school: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string;

  @Column({
    nullable: true,
    length: 4,
  })
  mbti: string;

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

  @OneToMany(() => LunchMenuReaction, (lunchMenuReaction) => lunchMenuReaction.user)
  reactions: LunchMenuReaction[];
}
