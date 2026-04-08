import { BaseTableEntity } from '../../commons/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RoomMember } from './room-member.entity';

export enum RoomType {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  ANY = 'ANY',
}

export enum RoomStatus {
  OPEN = 'OPEN',
  CLOSE = 'CLOSE',
}

@Entity('rooms')
export class Room extends BaseTableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 100,
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string;

  @Column({
    type: 'enum',
    enum: RoomType,
    name: 'room_type',
  })
  roomType: RoomType;

  @Column({
    name: 'max_members_count',
  })
  maxMembersCount: number;

  @Column({
    name: 'min_age',
  })
  minAge: number;

  @Column({
    name: 'max_age',
  })
  maxAge: number;

  @Column({
    length: 100,
  })
  place: string;

  @Column({ type: 'timestamp', name: 'lunch_at' })
  lunchAt: string;

  @Column({
    type: 'enum',
    enum: RoomStatus,
    default: RoomStatus.OPEN,
  })
  status: RoomStatus;

  @Column({ name: 'current_members_count', default: 1 })
  currentMembersCount: number;

  @OneToMany(() => RoomMember, (roomMember) => roomMember.room)
  roomMembers: RoomMember[];

  @ManyToOne(() => User, (user) => user.rooms)
  @JoinColumn({ name: 'host_user_id' })
  hostUser: User;

  @Column({ name: 'host_user_id' })
  hostUserId: number;
}
