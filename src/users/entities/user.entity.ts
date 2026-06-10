import { RegisterStatus } from './../types/user.type';
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
import { AuthProvider, Mbti, UserGender, UserRole } from '../types/user.type';

@Entity('users')
export class User extends BaseTableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    unique: true,
    length: 100,
  })
  email: string;

  @Column({
    length: 20,
  })
  name: string;

  @Column({
    unique: true,
    length: 50,
    nullable: true,
  })
  nickname: string;

  @Column({ type: 'varchar', name: 'hashed_password', nullable: true, select: false })
  hashedPassword: string | null;

  @Column({
    type: 'date',
    name: 'birth_date',
    nullable: true,
  })
  birthDate: string;

  @Column({
    type: 'enum',
    enum: UserGender,
    nullable: true,
  })
  gender: UserGender;

  @Column({
    length: 100,
    name: 'school_info',
    nullable: true,
  })
  schoolInfo: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  introduce: string | null;

  @Column({
    type: 'enum',
    enum: Mbti,
    nullable: true,
  })
  mbti: Mbti | null;

  @Column({
    type: 'varchar',
    name: 'refresh_token_hash',
    nullable: true,
    select: false,
  })
  refreshTokenHash: string | null;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.local,
  })
  provider: AuthProvider;

  @Column({ nullable: true })
  providerId: string;

  @Column({ nullable: true })
  providerAccessToken: string;

  @Column({ nullable: true })
  providerRefreshToken: string;

  @Column({ type: 'enum', enum: RegisterStatus, default: RegisterStatus.COMPLETE })
  registerStatus: RegisterStatus;

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

  @OneToMany(() => Room, (room) => room.hostUser)
  rooms: Room[];

  @OneToMany(() => RoomMember, (roomMember) => roomMember.user)
  roomMembers: RoomMember[];

  @OneToMany(() => CommentLike, (commentLike) => commentLike.user)
  commentLikes: CommentLike[];

  @OneToMany(() => MealMenuReaction, (mealMenuReaction) => mealMenuReaction.user)
  reactions: MealMenuReaction[];
}
