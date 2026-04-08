import { DataSource } from 'typeorm';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { RoomMember } from '../src/rooms/entities/room-member.entity';
import { Room, RoomStatus, RoomType } from '../src/rooms/entities/room.entity';
import { User } from '../src/users/entities/user.entity';

export const futureLunchAt = (hoursFromNow: number): string =>
  new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();

export const signupUser = async (
  httpApp: () => App,
  email: string,
  nickname: string,
): Promise<Response> => {
  return request(httpApp()).post('/auth/signup').send({
    email,
    password: '1q2w3e4r',
    birthDate: '2000-01-01',
    gender: 'MALE',
    nickname,
    schoolInfo: '인덕대학교',
  });
};

export const createRoomFixture = async (
  dataSource: DataSource,
  hostUser: User,
  overrides?: Partial<Room>,
): Promise<Room> => {
  const room = await dataSource.getRepository(Room).save({
    title: overrides?.title ?? '밥 같이 먹을 사람',
    description: overrides?.description ?? '난 컴소과',
    roomType: overrides?.roomType ?? RoomType.MALE,
    maxMembersCount: overrides?.maxMembersCount ?? 4,
    minAge: overrides?.minAge ?? 20,
    maxAge: overrides?.maxAge ?? 24,
    place: overrides?.place ?? '학식당 앞',
    lunchAt: overrides?.lunchAt ?? futureLunchAt(1),
    status: overrides?.status ?? RoomStatus.OPEN,
    currentMembersCount: overrides?.currentMembersCount ?? 1,
    hostUser,
  });

  await dataSource.getRepository(RoomMember).save({
    room,
    user: hostUser,
  });

  return room;
};

export const clearRoomTables = async (dataSource: DataSource): Promise<void> => {
  await dataSource.createQueryBuilder().delete().from(RoomMember).execute();
  await dataSource.createQueryBuilder().delete().from(Room).execute();
  await dataSource.createQueryBuilder().delete().from(User).execute();
};
