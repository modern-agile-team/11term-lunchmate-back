import { BaseTableEntity } from '../../commons/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RoomMember } from './room-member.entity';

enum RoomType {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  ANY = 'ANY',
}

enum RoomStatus {
  OPEN = 'OPEN',
  FULL = 'FULL',
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

  @Column()
  capacity: number;

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
  lunchAt: Date;

  @Column({
    type: 'enum',
    enum: RoomStatus,
    default: RoomStatus.OPEN,
  })
  status: RoomStatus;

  @Column({ name: 'current_count', default: 1 })
  currentCount: number;

  @OneToMany(() => RoomMember, (roomMember) => roomMember.room)
  roomMembers: RoomMember[];

  @ManyToOne(() => User, (user) => user.rooms)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
