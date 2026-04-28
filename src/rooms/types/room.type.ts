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
