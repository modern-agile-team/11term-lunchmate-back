import { RoomType } from '../entities/room.entity';
import { Room } from '../entities/room.entity';

export type UserConditionsParam = {
  age: number;
  gender: 'MALE' | 'FEMALE';
};

export type FindRoomsResult = {
  items: Room[];
  nextCursor: number | null;
  hasNext: boolean;
};

export type CreateRoomProps = {
  title: string;
  description: string;
  roomType: RoomType;
  maxMembersCount: number;
  maxAge: number;
  minAge: number;
  place: string;
  lunchAt: string;
  hostUser: { id: number };
};

export type UpdateRoomProps = Partial<Omit<CreateRoomProps, 'hostUser'>>;
