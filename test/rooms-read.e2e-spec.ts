import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { RoomStatus, RoomType } from '../src/rooms/entities/room.entity';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';
import { clearRoomTables, createRoomFixture, futureLunchAt, signupUser } from './rooms.e2e-helper';

jest.setTimeout(30000);

describe('Rooms Read (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const httpApp = () => app.getHttpAdapter().getInstance();

  beforeAll(async () => {
    app = (await createAuthUserTestApp()) as INestApplication<App>;
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearRoomTables(dataSource);
  });

  it('GET /rooms 방 목록을 cursor pagination으로 조회', async () => {
    const signupResponse = await signupUser(httpApp, 'test@gmail.com', '목록호스트');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: signupResponse.body.user.id,
    });
    const firstLunchAt = futureLunchAt(1);
    const secondLunchAt = futureLunchAt(2);
    const thirdLunchAt = futureLunchAt(3);

    const firstRoom = await createRoomFixture(dataSource, hostUser, {
      title: '첫 번째 방',
      currentMembersCount: 2,
      lunchAt: firstLunchAt,
    });
    const secondRoom = await createRoomFixture(dataSource, hostUser, {
      title: '두 번째 방',
      currentMembersCount: 3,
      lunchAt: secondLunchAt,
    });
    const thirdRoom = await createRoomFixture(dataSource, hostUser, {
      title: '세 번째 방',
      currentMembersCount: 4,
      roomType: RoomType.FEMALE,
      lunchAt: thirdLunchAt,
    });

    const response = await request(httpApp()).get('/rooms').query({
      limit: 2,
      status: RoomStatus.OPEN,
    });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0].id).toBe(thirdRoom.id);
    expect(response.body.items[0].title).toBe('세 번째 방');
    expect(response.body.items[0].lunchAt).toBe(thirdLunchAt);
    expect(response.body.items[1].id).toBe(secondRoom.id);
    expect(response.body.items[1].lunchAt).toBe(secondLunchAt);
    expect(response.body.hasNext).toBe(true);
    expect(response.body.nextCursor).toBe(secondRoom.id);

    const nextPageResponse = await request(httpApp()).get('/rooms').query({
      cursor: response.body.nextCursor,
      limit: 2,
      status: RoomStatus.OPEN,
    });

    expect(nextPageResponse.status).toBe(200);
    expect(nextPageResponse.body.items).toHaveLength(1);
    expect(nextPageResponse.body.items[0].id).toBe(firstRoom.id);
    expect(nextPageResponse.body.items[0].lunchAt).toBe(firstLunchAt);
    expect(nextPageResponse.body.hasNext).toBe(false);
    expect(nextPageResponse.body.nextCursor).toBeNull();
  });

  it('GET /rooms/:id 방 상세 정보를 조회한다', async () => {
    const signupResponse = await signupUser(httpApp, 'test@gmail.com', '상세호스트');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: signupResponse.body.user.id,
    });
    const lunchAt = futureLunchAt(1);

    const room = await createRoomFixture(dataSource, hostUser, {
      title: '상세 조회 방',
      description: '상세 설명',
      currentMembersCount: 1,
      lunchAt,
    });

    const response = await request(httpApp()).get(`/rooms/${room.id}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(room.id);
    expect(response.body.title).toBe('상세 조회 방');
    expect(response.body.description).toBe('상세 설명');
    expect(response.body.hostUserId).toBe(hostUser.id);
    expect(response.body.currentMembersCount).toBe(1);
    expect(response.body.lunchAt).toBe(lunchAt);
    expect(response.body.createdAt).toBe(new Date(room.createdAt).toISOString());
    expect(response.body.roomMembers).toHaveLength(1);
    expect(response.body.roomMembers[0].id).toBe(hostUser.id);
    expect(response.body.roomMembers[0].nickname).toBe('상세호스트');
    expect(response.body.roomMembers[0].age).toBe(26);
    expect(response.body.roomMembers[0].gender).toBe('MALE');
    expect(response.body.roomMembers[0].schoolInfo).toBe('인덕대학교');
    expect(response.body.roomMembers[0].mbti).toBeNull();
  });
});
