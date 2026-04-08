import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { RoomMember } from '../src/rooms/entities/room-member.entity';
import { Room, RoomStatus, RoomType } from '../src/rooms/entities/room.entity';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';

jest.setTimeout(30000);

describe('Rooms (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const httpApp = () => app.getHttpAdapter().getInstance();
  const futureLunchAt = (hoursFromNow: number) =>
    new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
  const signupUser = async (email: string, nickname: string) => {
    return request(httpApp()).post('/auth/signup').send({
      email,
      password: '1q2w3e4r',
      birthDate: '2000-01-01',
      gender: 'MALE',
      nickname,
      schoolInfo: '인덕대학교',
    });
  };

  const createRoomFixture = async (hostUser: User, overrides?: Partial<Room>): Promise<Room> => {
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

  beforeAll(async () => {
    app = (await createAuthUserTestApp()) as INestApplication<App>;
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.createQueryBuilder().delete().from(RoomMember).execute();
    await dataSource.createQueryBuilder().delete().from(Room).execute();
    await dataSource.createQueryBuilder().delete().from(User).execute();
  });

  it('POST /rooms 방 생성 성공', async () => {
    const lunchAt = futureLunchAt(1);

    const signupResponse = await request(httpApp()).post('/auth/signup').send({
      email: 'test123@gmail.com',
      password: '1q2w3e4r',
      birthDate: '2000-01-01',
      gender: 'MALE',
      nickname: '길동홍',
      schoolInfo: '인덕대학교',
    });

    const response = await request(httpApp())
      .post('/rooms')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        title: '밥 같이 먹을 사람',
        description: '난 컴소과',
        roomType: 'MALE',
        maxMembersCount: 4,
        place: '학식당 앞',
        lunchAt,
        minAge: 20,
        maxAge: 24,
      });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('밥 같이 먹을 사람');
    expect(response.body.description).toBe('난 컴소과');
    expect(response.body.hostUserId).toBe(signupResponse.body.user.id);
    expect(response.body.currentMembersCount).toBe(1);
    expect(response.body.roomMembers).toHaveLength(1);
    expect(response.body.roomMembers[0].nickname).toBe('길동홍');
    expect(response.body.lunchAt).toBe(lunchAt);

    const createdRoom = await dataSource.getRepository(Room).findOne({
      where: { id: response.body.id },
      relations: {
        hostUser: true,
      },
    });

    expect(createdRoom).not.toBeNull();
    expect(createdRoom?.hostUser.id).toBe(signupResponse.body.user.id);
    expect(response.body.createdAt).toBe(new Date(createdRoom!.createdAt).toISOString());
  });

  it('POST /rooms 이미 참여 중인 방이 있으면 생성 실패', async () => {
    const signupResponse = await request(httpApp()).post('/auth/signup').send({
      email: 'test123@gmail.com',
      password: '1q2w3e4r',
      birthDate: '2000-01-01',
      gender: 'MALE',
      nickname: '길동홍',
      schoolInfo: '인덕대',
    });

    const firstResponse = await request(httpApp())
      .post('/rooms')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        title: '첫 번째 방',
        description: '첫 생성',
        roomType: 'MALE',
        maxMembersCount: 4,
        place: '학식당',
        lunchAt: futureLunchAt(1),
        minAge: 20,
        maxAge: 24,
      });

    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(httpApp())
      .post('/rooms')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        title: '두 번째 방',
        description: '중복 생성 시도',
        roomType: 'MALE',
        maxMembersCount: 4,
        place: '학식당 앞',
        lunchAt: futureLunchAt(2),
        minAge: 20,
        maxAge: 24,
      });

    expect(secondResponse.status).toBe(400);
    expect(secondResponse.body.message).toBe('이미 참여 중인 방이 있습니다.');

    const roomCount = await dataSource.getRepository(Room).count();

    expect(roomCount).toBe(1);
  });

  it('GET /rooms 방 목록을 cursor pagination으로 조회', async () => {
    const signupResponse = await signupUser('test@gmail.com', '목록호스트');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: signupResponse.body.user.id,
    });
    const firstLunchAt = futureLunchAt(1);
    const secondLunchAt = futureLunchAt(2);
    const thirdLunchAt = futureLunchAt(3);

    const firstRoom = await createRoomFixture(hostUser, {
      title: '첫 번째 방',
      currentMembersCount: 2,
      lunchAt: firstLunchAt,
    });
    const secondRoom = await createRoomFixture(hostUser, {
      title: '두 번째 방',
      currentMembersCount: 3,
      lunchAt: secondLunchAt,
    });
    const thirdRoom = await createRoomFixture(hostUser, {
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
    const signupResponse = await signupUser('test@gmail.com', '상세호스트');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: signupResponse.body.user.id,
    });
    const lunchAt = futureLunchAt(1);

    const room = await createRoomFixture(hostUser, {
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
    expect(response.body.roomMembers[0].nickname).toBe('상세호스트');
  });
});
